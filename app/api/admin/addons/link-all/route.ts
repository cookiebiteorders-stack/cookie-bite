import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { linkAddonsToAllProducts } from "@/lib/db/addons";
import { bilingualError } from "@/lib/validations";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";

const linkToAllSchema = z.object({ addon_ids: z.array(z.string().uuid()).min(1) });

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("addons");
  requireWritePermission(actor);

  const parsed = linkToAllSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await linkAddonsToAllProducts(parsed.data.addon_ids);
    
    return NextResponse.json({
      ok: true,
      result: {
        linked: result.linked,
        skipped: result.skipped,
        errors: result.errors,
      },
    });
  } catch (err) {
    console.error("linkAddonsToAllProducts", err);
    return NextResponse.json(
      bilingualError("Failed to link add-ons to products", "فشل ربط الإضافات بالمنتجات"),
      { status: 500 },
    );
  }
}
