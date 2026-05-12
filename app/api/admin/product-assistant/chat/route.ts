import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import {
  productWizardDraftSchema,
  runWizardTurn,
  type ProductWizardState,
  WIZARD_STEPS,
} from "@/lib/admin/product-assistant/wizard";

const wizardStateSchema = z.object({
  active: z.boolean(),
  step: z.enum(WIZARD_STEPS),
  draft: productWizardDraftSchema.partial().default({}),
});

const bodySchema = z.object({
  message: z.string().max(8000).default(""),
  wizard: wizardStateSchema,
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  const { message, wizard: wizardIn } = parsed.data;
  const wizard: ProductWizardState = {
    active: wizardIn.active,
    step: wizardIn.step,
    draft: wizardIn.draft ?? {},
  };

  let turn = runWizardTurn({ userMessage: message, wizard });

  if (turn.requestGeminiDescription) {
    const name = turn.wizard.draft.name?.trim() ?? "Product";
    const category = turn.wizard.draft.category?.trim() ?? "";
    const price = turn.wizard.draft.price_egp;
    try {
      const description = await runMrBrownieGemini({
        systemInstruction:
          "You write concise e-commerce product descriptions in English only. Output plain text, no markdown, 2–4 short paragraphs, SEO-friendly, appetizing tone for a bakery/dessert brand. No placeholders.",
        messages: [
          {
            role: "user",
            content: `Write a product description for:\nName: ${name}\nCategory: ${category || "general"}\nPrice EGP: ${price ?? "unknown"}\nStock: ${turn.wizard.draft.stock ?? "unknown"}`,
          },
        ],
        temperature: 0.65,
        maxOutputTokens: 1024,
      });
      turn = runWizardTurn({
        userMessage: message,
        wizard: turn.wizard,
        injectedDescription: description.trim().slice(0, 3000),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gemini error";
      return NextResponse.json(
        {
          ...bilingualError(
            msg.includes("GEMINI_API_KEY") ? "GEMINI_API_KEY is not set" : msg,
            msg.includes("GEMINI_API_KEY")
              ? "لم يُضبط مفتاح GEMINI_API_KEY في البيئة"
              : "فشل توليد الوصف",
          ),
          wizard: turn.wizard,
          reply:
            "تعذّر توليد الوصف تلقائياً. اكتب وصفاً يدوياً أو تأكد من ضبط **GEMINI_API_KEY**.",
          compiledPayload: null,
        },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({
    reply: turn.reply,
    wizard: turn.wizard,
    compiledPayload: turn.compiledPayload,
    requestGeminiDescription: false,
  });
}
