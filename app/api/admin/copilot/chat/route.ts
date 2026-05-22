import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { loadOperatorMemory } from "@/lib/admin/copilot/memory";
import { buildCopilotSystemPrompt, type CopilotPromptContext } from "@/lib/admin/copilot/system-prompt";
import { runCopilot } from "@/lib/admin/copilot/runner";
import type { CopilotToolActor } from "@/lib/admin/copilot/tools";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CopilotToolCall } from "@/lib/admin/copilot/tools";
import { CHAT_IMAGE_MAX_COUNT, isAllowedChatImageUrl } from "@/lib/chat/image-attachments";

const attachmentSchema = z.object({
  url: z.string().url().max(2000),
  mimeType: z.string().max(80).optional(),
  name: z.string().max(200).optional(),
});

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
  attachments: z.array(attachmentSchema).max(CHAT_IMAGE_MAX_COUNT).optional(),
});

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  attachments: z.array(attachmentSchema).max(CHAT_IMAGE_MAX_COUNT).optional(),
  history: z.array(messageSchema).max(20).default([]),
  currentPath: z.string().max(200).default("/admin"),
  language: z.enum(["en", "ar"]).default("en"),
});

async function loadLiveSnapshot(): Promise<CopilotPromptContext["snapshot"]> {
  try {
    const sb = createSupabaseAdminClient();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const yesterday = new Date(todayStart);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const [todayOrders, newCustomers, pending, lowStock, failed] = await Promise.all([
      sb.from("orders").select("total_egp").gte("created_at", todayIso),
      sb
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
        .gte("created_at", todayIso),
      sb.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb
        .from("products")
        .select("id", { count: "exact", head: true })
        .lte("stock", 5)
        .eq("is_active", true),
      sb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "failed")
        .gte("created_at", yesterday.toISOString()),
    ]);

    const rows = (todayOrders.data ?? []) as Array<{ total_egp: number }>;
    return {
      revenueToday: rows.reduce((a, r) => a + Number(r.total_egp ?? 0), 0),
      ordersToday: rows.length,
      newCustomersToday: newCustomers.count ?? 0,
      pendingOrders: pending.count ?? 0,
      lowStockSkus: lowStock.count ?? 0,
      failedPaymentsLast24h: failed.count ?? 0,
    };
  } catch {
    return null;
  }
}

function sanitizeAttachments(
  attachments: z.infer<typeof attachmentSchema>[] | undefined,
) {
  if (!attachments?.length) return undefined;
  const ok = attachments.filter((a) => isAllowedChatImageUrl(a.url));
  return ok.length ? ok : undefined;
}

function extractActions(toolCalls: CopilotToolCall[]) {
  return toolCalls
    .map((c) => {
      const r = c.result;
      if (typeof r !== "object" || r === null || Array.isArray(r)) return null;
      const rec = r as Record<string, unknown>;
      if (rec.ok !== true && !rec.dry_run) return null;
      return {
        tool: c.name,
        action: typeof rec.action === "string" ? rec.action : c.name,
        ...rec,
      };
    })
    .filter(Boolean);
}

function toolWarnings(toolCalls: CopilotToolCall[]): string[] {
  return toolCalls
    .map((c) => {
      const r = c.result;
      if (typeof r !== "object" || r === null || Array.isArray(r)) return null;
      const w = (r as { warning?: unknown }).warning;
      return typeof w === "string" && w.trim() ? `${c.name}: ${w.trim()}` : null;
    })
    .filter((x): x is string => Boolean(x));
}

export async function POST(req: NextRequest) {
  // Any admin/owner/staff with at least dashboard access can use the copilot.
  let actor;
  try {
    actor = await requireAdminAccess("dashboard");
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }
  const { message, history, currentPath, language } = parsed.data;
  const attachments = sanitizeAttachments(parsed.data.attachments);
  const safeHistory = history.map((m) => ({
    role: m.role,
    content: m.content,
    attachments: sanitizeAttachments(m.attachments),
  }));

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      bilingualError(
        "AI copilot is not configured — GEMINI_API_KEY missing",
        "المساعد الذكي غير مُهيّأ — مفتاح GEMINI_API_KEY مفقود",
      ),
      { status: 503 },
    );
  }

  const snapshot = await loadLiveSnapshot();
  const adminFirstName = (actor.email?.split("@")[0] ?? actor.role).split(/[._-]/)[0];

  const operatorMemory = await loadOperatorMemory(actor.clerk_user_id);

  const systemInstruction = buildCopilotSystemPrompt({
    today: new Date().toISOString().slice(0, 10),
    adminFirstName,
    role: actor.role as "owner" | "admin" | "staff",
    currency: "EGP",
    currentPath,
    snapshot,
    preferredLanguage: language,
    operatorMemory,
  });

  try {
    const toolActor: CopilotToolActor = {
      role: actor.role,
      email: actor.email,
      user_id: actor.user_id,
      clerk_user_id: actor.clerk_user_id,
    };
    const result = await runCopilot({
      systemInstruction,
      history: safeHistory,
      userMessage: message,
      attachments,
      actor: toolActor,
    });
    const warnings = toolWarnings(result.toolCalls);
    const reply =
      warnings.length > 0
        ? `${result.reply || ""}\n\n⚠️ ${warnings.join("\n")}`.trim()
        : result.reply;

    return NextResponse.json({
      reply,
      actions: extractActions(result.toolCalls),
      toolCalls: result.toolCalls.map((c) => ({
        name: c.name,
        args: c.args,
        ms: c.ms,
        // We don't echo the full tool result — it can be large + may contain
        // PII the admin doesn't need on-screen. The agent already used it to
        // craft the reply.
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Copilot failed";
    return NextResponse.json(
      bilingualError(msg, msg.includes("GEMINI") ? "خطأ في مفتاح Gemini" : "تعذّر تشغيل المساعد"),
      { status: 500 },
    );
  }
}
