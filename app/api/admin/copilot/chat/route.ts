import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { buildCopilotSystemPrompt, type CopilotPromptContext } from "@/lib/admin/copilot/system-prompt";
import { runCopilot } from "@/lib/admin/copilot/runner";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
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

  const systemInstruction = buildCopilotSystemPrompt({
    today: new Date().toISOString().slice(0, 10),
    adminFirstName,
    role: actor.role as "owner" | "admin" | "staff",
    currency: "EGP",
    currentPath,
    snapshot,
    preferredLanguage: language,
  });

  try {
    const result = await runCopilot({
      systemInstruction,
      history,
      userMessage: message,
    });
    return NextResponse.json({
      reply: result.reply,
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
