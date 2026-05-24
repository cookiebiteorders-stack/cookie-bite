import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import {
  analyzeProductTitle,
  generateProductFieldsFromName,
  mergeAiProductFields,
} from "@/lib/admin/product-auto-fill";
import { improveProductCopyWithAi } from "@/lib/admin/product-ai-assist";
import { extractJsonObject } from "@/lib/admin/json-from-model";
import { DEFAULT_PRODUCT_CATEGORIES, isKnownProductCategory } from "@/lib/admin/product-categories";

const bodySchema = z.object({
  name: z.string().min(2).max(200),
  description_en: z.string().max(3000).optional(),
  description_ar: z.string().max(3000).optional(),
  ingredients: z.string().max(500).optional(),
  title_en: z.string().max(200).optional(),
  title_ar: z.string().max(200).optional(),
});

const CATEGORY_VALUES = DEFAULT_PRODUCT_CATEGORIES.map((c) => c.value).join(", ");

function sanitizeAiFields(
  json: Record<string, unknown>,
): Partial<Record<string, string>> {
  const str = (key: string, max: number) => {
    const v = json[key];
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    return t ? t.slice(0, max) : undefined;
  };

  const category = str("category", 80);
  const out: Partial<Record<string, string>> = {
    title_en: str("title_en", 200),
    title_ar: str("title_ar", 200),
    description_en: str("description_en", 3000),
    description_ar: str("description_ar", 3000),
    ingredients: str("ingredients", 500),
    badges: str("badges", 120),
    seasons: str("seasons", 120),
    meta_title: str("meta_title", 70),
    meta_description: str("meta_description", 160),
  };

  if (category && isKnownProductCategory(category)) {
    out.category = category;
  }

  // رفض عناوين مختلطة اللغة
  if (out.title_en && /[\u0600-\u06FF]/.test(out.title_en)) delete out.title_en;
  if (out.title_ar && /[a-zA-Z]/.test(out.title_ar)) delete out.title_ar;

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

  const { name: rawName, description_en, description_ar, ingredients, title_en, title_ar } =
    parsed.data;
  const name = rawName.trim();
  const local = generateProductFieldsFromName(name);
  const analysis = analyzeProductTitle(name);

  let source: "local" | "ai" = "local";
  let fields = local;

  const hasExistingCopy = [description_en, description_ar, ingredients, title_en, title_ar].some(
    (v) => typeof v === "string" && v.trim().length > 0,
  );

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey) {
    try {
      if (hasExistingCopy) {
        const { fields: improved } = await improveProductCopyWithAi({
          name,
          title_en,
          title_ar,
          description_en,
          description_ar,
          ingredients,
        });
        fields = mergeAiProductFields(local, {
          ...improved,
          name: improved.name ?? name,
        } as Partial<import("@/lib/admin/products-dashboard-types").ProductFormState>);
        source = "ai";
      } else {
        const raw = await runMrBrownieGemini({
          systemInstruction: `You analyze bakery product titles for Cookie Bite e-commerce.
Return ONLY valid JSON (no markdown). Rules:
- title_en: English ONLY — zero Arabic characters.
- title_ar: Arabic ONLY — zero Latin letters (a-z A-Z).
- Understand flavors, format (cookie/brownie/box), and occasion from the title words.
- category: exactly one of: ${CATEGORY_VALUES}
- description_en / description_ar: 2 short appetizing sentences each, matching the analyzed product.
- badges: comma-separated from: bestseller,new,trending,featured (or empty)
- seasons: comma-separated from: ramadan,eid,summer,winter,spring,valentine,christmas (or empty)
- ingredients: brief bilingual note separated by comma (EN part, AR part)`,
          messages: [
            {
              role: "user",
              content: `Analyze this product title and fill fields:\n"${name}"\n\nDetected tokens EN: ${analysis.englishTokens.join(", ") || "none"}\nDetected tokens AR: ${analysis.arabicTokens.join(", ") || "none"}\nSuggested category: ${analysis.category}`,
            },
          ],
          temperature: 0.35,
          maxOutputTokens: 768,
        });

        const json = extractJsonObject(raw);
        if (json) {
          const aiSlice = sanitizeAiFields(json);
          fields = mergeAiProductFields(
            local,
            aiSlice as Partial<import("@/lib/admin/products-dashboard-types").ProductFormState>,
          );
          source = "ai";
        }
      }
    } catch {
      /* fallback to local — already set */
    }
  }

  return NextResponse.json({
    ok: true,
    source,
    analysis: {
      primaryScript: analysis.primaryScript,
      englishTokens: analysis.englishTokens,
      arabicTokens: analysis.arabicTokens,
      category: analysis.category,
    },
    fields,
  });
}
