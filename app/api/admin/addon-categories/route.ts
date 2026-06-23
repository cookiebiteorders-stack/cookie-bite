import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAddonCategory,
  deleteAddonCategory,
  listAddonCategoriesWithItems,
  mergeAddonCategories,
  saveAddonCategoryItems,
  updateAddonCategoryMeta,
} from "@/lib/db/addon-categories";
import { dedupeAddonOptions } from "@/lib/addons/dedupe";
import {
  addonCategoryItemSchema,
  addonCategorySchema,
  mergeAddonCategoriesSchema,
} from "@/lib/addons/validation";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

const createSchema = addonCategorySchema.omit({ id: true });
const updateMetaSchema = addonCategorySchema.extend({ id: z.string().uuid() });
const saveItemsSchema = z.object({
  id: z.string().uuid(),
  items: z.array(addonCategoryItemSchema),
});
const deleteSchema = z.object({ id: z.string().uuid() });
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("merge") }).merge(mergeAddonCategoriesSchema),
  z.object({
    action: z.literal("save_items"),
    id: z.string().uuid(),
    items: z.array(addonCategoryItemSchema),
  }),
]);

export async function GET() {
  await requireAdminAccess("addons");
  const categories = await listAddonCategoriesWithItems();
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("addons");
  requireWritePermission(actor);
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const category = await createAddonCategory(parsed.data);
  if (!category) {
    return NextResponse.json(
      bilingualError("Failed to create category", "فشل إنشاء التصنيف"),
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, category }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("addons");
  requireWritePermission(actor);
  const body = await req.json().catch(() => null);

  const actionParsed = actionSchema.safeParse(body);
  if (actionParsed.success) {
    if (actionParsed.data.action === "merge") {
      const result = await mergeAddonCategories(
        actionParsed.data.target_id,
        actionParsed.data.source_ids,
      );
      if (!result.ok) {
        return NextResponse.json(
          { ...bilingualError("Merge failed", "فشل الدمج"), message: result.error },
          { status: 400 },
        );
      }
      return NextResponse.json({ ok: true, category: result.category });
    }
    const items = dedupeAddonOptions(
      actionParsed.data.items.map((item) => ({
        id: item.id?.trim() || crypto.randomUUID(),
        name: item.name.trim(),
        price: Math.max(0, Number(item.price) || 0),
        weight_grams:
          item.weight_grams != null && item.weight_grams >= 0
            ? Math.floor(item.weight_grams)
            : null,
        stock:
          item.stock != null && item.stock >= 0 ? Math.floor(item.stock) : null,
        quantity_limit: item.quantity_limit ?? null,
        default_selected: Boolean(item.default_selected),
      })),
    );
    const category = await saveAddonCategoryItems(actionParsed.data.id, items);
    if (!category) {
      return NextResponse.json(
        bilingualError("Failed to save items", "فشل حفظ العناصر"),
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, category });
  }

  const metaParsed = updateMetaSchema.safeParse(body);
  if (metaParsed.success) {
    const { id, ...patch } = metaParsed.data;
    const category = await updateAddonCategoryMeta(id, patch);
    if (!category) {
      return NextResponse.json(
        bilingualError("Failed to update category", "فشل تحديث التصنيف"),
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, category });
  }

  const itemsOnly = saveItemsSchema.safeParse(body);
  if (itemsOnly.success) {
    const items = dedupeAddonOptions(
      itemsOnly.data.items.map((item) => ({
        id: item.id?.trim() || crypto.randomUUID(),
        name: item.name.trim(),
        price: Math.max(0, Number(item.price) || 0),
        weight_grams:
          item.weight_grams != null && item.weight_grams >= 0
            ? Math.floor(item.weight_grams)
            : null,
        stock:
          item.stock != null && item.stock >= 0 ? Math.floor(item.stock) : null,
        quantity_limit: item.quantity_limit ?? null,
        default_selected: Boolean(item.default_selected),
      })),
    );
    const category = await saveAddonCategoryItems(itemsOnly.data.id, items);
    if (!category) {
      return NextResponse.json(
        bilingualError("Failed to save items", "فشل حفظ العناصر"),
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, category });
  }

  return NextResponse.json(
    { ...bilingualError("Invalid payload", "بيانات غير صالحة") },
    { status: 400 },
  );
}

export async function DELETE(req: NextRequest) {
  const actor = await requireAdminAccess("addons");
  requireWritePermission(actor);
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ...bilingualError("Invalid payload", "بيانات غير صالحة"), details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const result = await deleteAddonCategory(parsed.data.id);
  if (!result.ok) {
    return NextResponse.json(
      { ...bilingualError("Failed to delete category", "فشل حذف التصنيف"), message: result.error },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
