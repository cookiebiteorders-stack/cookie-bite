import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import { extractJsonObject } from "@/lib/admin/json-from-model";

const bodySchema = z.object({
  prompt: z.string().min(6).max(1200),
});

const addonDraftSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().default(""),
  type: z.enum(["single_choice", "multiple_choice"]).default("single_choice"),
  required: z.boolean().default(false),
  options: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        size: z.string().max(80).nullable().optional(),
        price: z.number().nonnegative(),
        quantity_limit: z.number().int().positive().nullable().optional(),
        default_selected: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(12),
});

const SYSTEM_PROMPT = `You are helping Cookie Bite admin create product add-ons for ecommerce.
Return ONLY valid JSON with this exact shape:
{
  "name": string,
  "description": string,
  "type": "single_choice" | "multiple_choice",
  "required": boolean,
  "options": [
    {
      "name": string,
      "size": string | null,
      "price": number,
      "quantity_limit": number | null,
      "default_selected": boolean
    }
  ]
}

Rules:
- Currency is EGP.
- Prices must be realistic and non-negative.
- If type is single_choice, only one option can be default_selected=true.
- quantity_limit is null unless specifically needed.
- No markdown, no extra keys, no explanations.`;

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("addons");
  requireWritePermission(actor);

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      bilingualError(
        "GEMINI_API_KEY is not set",
        "لم يُضبط مفتاح GEMINI_API_KEY — أضفه لتفعيل مساعد إضافات المنتجات",
      ),
      { status: 503 },
    );
  }

  try {
    const raw = await runMrBrownieGemini({
      systemInstruction: SYSTEM_PROMPT,
      messages: [{ role: "user", content: parsedBody.data.prompt }],
      temperature: 0.35,
      maxOutputTokens: 1400,
    });

    const json = extractJsonObject(raw);
    if (!json) {
      return NextResponse.json(
        bilingualError("Could not parse AI response", "تعذر قراءة رد الذكاء الاصطناعي"),
        { status: 502 },
      );
    }

    const parsedDraft = addonDraftSchema.safeParse(json);
    if (!parsedDraft.success) {
      return NextResponse.json(
        {
          ...bilingualError("AI returned invalid add-on draft", "الذكاء الاصطناعي أعاد صيغة إضافة غير صالحة"),
          details: parsedDraft.error.flatten(),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, draft: parsedDraft.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI assist failed";
    return NextResponse.json(bilingualError(message, "تعذّر تشغيل مساعد الإضافات"), {
      status: 502,
    });
  }
}
