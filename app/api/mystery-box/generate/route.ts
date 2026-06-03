import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMysteryBoxSelection } from "@/lib/mystery-box/generate";
import { loadMysteryCandidates } from "@/lib/mystery-box/products";
import { findMysteryBoxRule } from "@/lib/mystery-box/rules";
import type { MysteryOccasion } from "@/lib/mystery-box/types";
import { bilingualError } from "@/lib/validations";

const bodySchema = z.object({
  occasion: z.enum(["birthday", "ramadan", "thanks", "corporate", "wedding"]),
  budget: z.number().positive().max(50000),
  preferences: z.string().max(500).optional(),
  lang: z.enum(["en", "ar"]).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid mystery box request", "طلب صندوق المفاجأة غير صالح"),
      { status: 400 },
    );
  }

  const { occasion, budget, preferences, lang = "en" } = parsed.data;
  const rule = await findMysteryBoxRule(occasion, budget);
  if (!rule) {
    return NextResponse.json(
      bilingualError(
        "No box template for this budget and occasion",
        "لا يوجد قالب لهذه المناسبة والميزانية",
      ),
      { status: 404 },
    );
  }

  const products = await loadMysteryCandidates(lang);
  if (!products.length) {
    return NextResponse.json(
      bilingualError("No products available", "لا توجد منتجات متاحة"),
      { status: 503 },
    );
  }

  const result = generateMysteryBoxSelection({
    rule,
    occasion: occasion as MysteryOccasion,
    budget,
    preferences,
    products,
    lang,
  });

  if (!result) {
    return NextResponse.json(
      bilingualError(
        "Could not build a box for this budget — try another amount",
        "تعذر تكوين صندوق بهذه الميزانية — جرّب مبلغاً آخر",
      ),
      { status: 422 },
    );
  }

  return NextResponse.json({ box: result });
}
