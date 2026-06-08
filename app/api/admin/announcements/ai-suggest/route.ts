import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireAdminAccess } from "@/lib/admin/require-admin";

type SuggestAction =
  | "translate_en_to_ar"
  | "translate_ar_to_en"
  | "suggest_full"
  | "improve_text";

type SuggestRequest = {
  action: SuggestAction;
  type?: string;
  title_en?: string;
  title_ar?: string;
  message_en?: string;
  message_ar?: string;
  cta_label_en?: string;
  cta_label_ar?: string;
  hint?: string;
};

type SuggestResult = {
  title_en?: string;
  title_ar?: string;
  message_en?: string;
  message_ar?: string;
  cta_label_en?: string;
  cta_label_ar?: string;
};

const BRAND_CONTEXT = `
You are a copywriter for "Cookie Bite" — a premium handcrafted cookie brand in Egypt.
Brand voice: warm, playful, a touch luxurious. Audience: Arabic/English speakers.
Keep announcements concise (title ≤ 8 words, message ≤ 20 words).
Always return valid JSON only, no markdown, no explanations.
`;

function buildPrompt(req: SuggestRequest): string {
  if (req.action === "translate_en_to_ar") {
    return `
${BRAND_CONTEXT}
Translate the following announcement from English to Egyptian Arabic (formal, warm tone).
Input JSON:
${JSON.stringify({ title_en: req.title_en, message_en: req.message_en, cta_label_en: req.cta_label_en })}
Return JSON with keys: title_ar, message_ar, cta_label_ar (omit if empty).
`.trim();
  }

  if (req.action === "translate_ar_to_en") {
    return `
${BRAND_CONTEXT}
Translate the following announcement from Arabic to English.
Input JSON:
${JSON.stringify({ title_ar: req.title_ar, message_ar: req.message_ar, cta_label_ar: req.cta_label_ar })}
Return JSON with keys: title_en, message_en, cta_label_en (omit if empty).
`.trim();
  }

  if (req.action === "suggest_full") {
    return `
${BRAND_CONTEXT}
Create a complete announcement for a "${req.type ?? "banner"}" notification.
${req.hint ? `Hint/topic: "${req.hint}"` : "Pick a relevant seasonal or promotional topic."}
Return JSON with keys: title_en, title_ar, message_en, message_ar, cta_label_en, cta_label_ar.
cta_label fields should be a short call-to-action (e.g. "Shop Now" / "اطلب الآن"), or omit if not applicable.
`.trim();
  }

  if (req.action === "improve_text") {
    return `
${BRAND_CONTEXT}
Improve the following announcement text to be more engaging and on-brand.
Input JSON:
${JSON.stringify({ title_en: req.title_en, title_ar: req.title_ar, message_en: req.message_en, message_ar: req.message_ar })}
Return JSON with the same keys, with improved text. Keep both languages consistent in meaning.
`.trim();
  }

  return "";
}

export async function POST(request: Request) {
  await requireAdminAccess("cms");

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: { en: "AI not configured", ar: "لم يُضبط مفتاح الذكاء الاصطناعي" } },
      { status: 503 },
    );
  }

  let body: SuggestRequest;
  try {
    body = (await request.json()) as SuggestRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = buildPrompt(body);
  if (!prompt) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const model = process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 400,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result: SuggestResult = JSON.parse(raw);
    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
