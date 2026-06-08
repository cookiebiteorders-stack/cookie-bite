import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { extractJsonObject } from "@/lib/admin/json-from-model";
import { ANNOUNCEMENT_TYPES } from "@/lib/announcements/shared";
import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import { bilingualError } from "@/lib/validations";

const bodySchema = z.object({
  mode: z.enum(["generate", "sync"]).default("generate"),
  prompt: z.string().max(1500).optional(),
  type: z.enum(ANNOUNCEMENT_TYPES as [string, ...string[]]).default("banner"),
  sourceLang: z.enum(["en", "ar"]).optional(),
  title_en: z.string().max(200).optional(),
  title_ar: z.string().max(200).optional(),
  message_en: z.string().max(600).optional(),
  message_ar: z.string().max(600).optional(),
  cta_label_en: z.string().max(80).optional(),
  cta_label_ar: z.string().max(80).optional(),
  cta_url: z.string().max(500).optional(),
});

const draftSchema = z.object({
  type: z.enum(ANNOUNCEMENT_TYPES as [string, ...string[]]),
  title_en: z.string().min(1).max(200),
  title_ar: z.string().min(1).max(200),
  message_en: z.string().min(1).max(600),
  message_ar: z.string().min(1).max(600),
  cta_label_en: z.string().max(80).nullable().optional(),
  cta_label_ar: z.string().max(80).nullable().optional(),
  cta_url: z.string().max(500).nullable().optional(),
  suggested_priority: z.number().int().min(0).max(100).optional(),
  suggested_status: z.enum(["active", "draft", "scheduled"]).optional(),
});

const SYSTEM_PROMPT = `You help Cookie Bite (premium cookie bakery in Egypt) write storefront announcements.
Return ONLY valid JSON with this exact shape:
{
  "type": "banner" | "popup" | "notification" | "inline" | "system",
  "title_en": string,
  "title_ar": string,
  "message_en": string,
  "message_ar": string,
  "cta_label_en": string | null,
  "cta_label_ar": string | null,
  "cta_url": string | null,
  "suggested_priority": number,
  "suggested_status": "active" | "draft" | "scheduled"
}

Rules:
- Arabic and English must convey the SAME meaning (not literal word-for-word — natural marketing copy in each language).
- For type "banner": short ticker text — title is the hook (≤8 words), message adds detail (≤20 words). No CTA needed unless user asks.
- For popup/notification: title + message can be slightly longer; include CTA when relevant.
- Currency/prices in EGP when mentioned.
- Use {name} only if personalization fits.
- suggested_priority: 50–80 for promos, 40–60 for info.
- suggested_status: "active" unless dates or approval implied.
- No markdown, no extra keys, no explanations.`;

function buildUserMessage(data: z.infer<typeof bodySchema>): string {
  if (data.mode === "sync") {
    const lang = data.sourceLang ?? "en";
    return JSON.stringify({
      task: "Complete the missing language fields to match the source copy. Keep tone, offers, and facts identical.",
      sourceLang: lang,
      type: data.type,
      title_en: data.title_en ?? "",
      title_ar: data.title_ar ?? "",
      message_en: data.message_en ?? "",
      message_ar: data.message_ar ?? "",
      cta_label_en: data.cta_label_en ?? "",
      cta_label_ar: data.cta_label_ar ?? "",
      cta_url: data.cta_url ?? "",
    });
  }

  return JSON.stringify({
    task: "Generate a bilingual announcement draft from the admin brief.",
    type: data.type,
    brief: data.prompt ?? "",
  });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("cms");
  requireWritePermission(actor);

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  if (parsedBody.data.mode === "generate" && !parsedBody.data.prompt?.trim()) {
    return NextResponse.json(
      bilingualError("Describe what you want to announce", "صف الإعلان الذي تريده"),
      { status: 400 },
    );
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      bilingualError(
        "GEMINI_API_KEY is not set",
        "لم يُضبط مفتاح GEMINI_API_KEY — أضفه لتفعيل مساعد الإعلانات",
      ),
      { status: 503 },
    );
  }

  try {
    const raw = await runMrBrownieGemini({
      systemInstruction: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(parsedBody.data) }],
      temperature: 0.4,
      maxOutputTokens: 1200,
    });

    const json = extractJsonObject(raw);
    if (!json) {
      return NextResponse.json(
        bilingualError("Could not parse AI response", "تعذر قراءة رد الذكاء الاصطناعي"),
        { status: 502 },
      );
    }

    const withType = {
      ...json,
      type: (json as { type?: string }).type ?? parsedBody.data.type,
    };

    const parsedDraft = draftSchema.safeParse(withType);
    if (!parsedDraft.success) {
      return NextResponse.json(
        {
          ...bilingualError(
            "AI returned invalid announcement draft",
            "الذكاء الاصطناعي أعاد صيغة إعلان غير صالحة",
          ),
          details: parsedDraft.error.flatten(),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, draft: parsedDraft.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI assist failed";
    return NextResponse.json(bilingualError(message, "تعذّر تشغيل مساعد الإعلانات"), {
      status: 502,
    });
  }
}
