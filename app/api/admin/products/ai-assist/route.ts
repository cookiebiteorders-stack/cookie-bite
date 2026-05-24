import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import {
  improveProductCopyWithAi,
  resolveProductImageWithAi,
  type ImprovedProductCopy,
} from "@/lib/admin/product-ai-assist";

const copyFieldsSchema = z.object({
  name: z.string().max(200).optional(),
  title_en: z.string().max(200).optional(),
  title_ar: z.string().max(200).optional(),
  description_en: z.string().max(3000).optional(),
  description_ar: z.string().max(3000).optional(),
  ingredients: z.string().max(500).optional(),
  category: z.string().max(80).optional(),
});

const bodySchema = z.discriminatedUnion("action", [
  copyFieldsSchema.extend({ action: z.literal("improve") }),
  z.object({
    action: z.literal("image"),
    name: z.string().min(2).max(200),
    title_en: z.string().max(200).optional(),
    description_en: z.string().max(3000).optional(),
    description_ar: z.string().max(3000).optional(),
    category: z.string().max(80).optional(),
  }),
]);

function mergeImprovedFields(
  current: z.infer<typeof copyFieldsSchema>,
  improved: ImprovedProductCopy,
): ImprovedProductCopy {
  const out: ImprovedProductCopy = {};
  const keys = [
    "name",
    "title_en",
    "title_ar",
    "description_en",
    "description_ar",
    "ingredients",
  ] as const;

  for (const key of keys) {
    const currentVal = current[key]?.trim() ?? "";
    const improvedVal = improved[key]?.trim();
    if (currentVal && improvedVal) out[key] = improvedVal;
    else if (improvedVal) out[key] = improvedVal;
  }

  return out;
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      bilingualError(
        "GEMINI_API_KEY is not set",
        "لم يُضبط مفتاح GEMINI_API_KEY — أضفه في البيئة لتفعيل مساعد المنتجات",
      ),
      { status: 503 },
    );
  }

  try {
    if (parsed.data.action === "improve") {
      const { action: _action, ...fields } = parsed.data;
      const { fields: improved, source } = await improveProductCopyWithAi(fields);
      const merged = mergeImprovedFields(fields, improved);

      return NextResponse.json({
        ok: true,
        action: "improve",
        source,
        fields: merged,
      });
    }

    const { name, title_en, description_en, description_ar, category } = parsed.data;
    const image = await resolveProductImageWithAi({
      name,
      title_en,
      description_en,
      description_ar,
      category,
    });

    return NextResponse.json({
      ok: true,
      action: "image",
      image,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI assist failed";
    return NextResponse.json(bilingualError(msg, "تعذّر تشغيل مساعد الذكاء الاصطناعي"), {
      status: 502,
    });
  }
}
