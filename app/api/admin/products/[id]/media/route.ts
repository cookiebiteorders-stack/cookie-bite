import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { urlsShareCloudinaryAsset } from "@/lib/cloudinary/asset-key";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_PRODUCT_IMAGES, normalizeProductImages } from "@/lib/products/media";
import { bilingualError } from "@/lib/validations";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  kind: z.enum(["image", "video"]),
  url: z.string().trim().min(1),
});

/** إلحاق صورة/فيدio بمنتج محدد — دمج آمن من السيرفر يمنع تداخل الصور بين المنتجات. */
export async function POST(req: NextRequest, context: RouteContext) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid body", "بيانات غير صالحة"), { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: product, error: loadErr } = await supabase
    .from("products")
    .select("id, image_url, images, video_url")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !product) {
    return NextResponse.json(bilingualError("Product not found", "المنتج غير موجود"), { status: 404 });
  }

  const { kind, url } = parsed.data;

  if (kind === "video") {
    const { error } = await supabase
      .from("products")
      .update({ video_url: url })
      .eq("id", id);
    if (error) {
      return NextResponse.json(bilingualError("Update failed", "فشل التحديث"), { status: 500 });
    }
    return NextResponse.json({ ok: true, video_url: url });
  }

  const images = normalizeProductImages(product.images, product.image_url);
  const alreadyLinked = images.some((img) => urlsShareCloudinaryAsset(img.url, url));
  if (alreadyLinked) {
    return NextResponse.json({ ok: true, images, image_url: product.image_url });
  }

  if (images.length >= MAX_PRODUCT_IMAGES) {
    return NextResponse.json(
      bilingualError(
        `Maximum ${MAX_PRODUCT_IMAGES} images per product`,
        `الحد الأقصى ${MAX_PRODUCT_IMAGES} صور للمنتج`,
      ),
      { status: 409 },
    );
  }

  const nextImages = [
    ...images,
    { url, alt_en: null, alt_ar: null, order: images.length },
  ].slice(0, MAX_PRODUCT_IMAGES);

  const image_url = nextImages[0]?.url ?? url;

  const { error } = await supabase
    .from("products")
    .update({ images: nextImages, image_url })
    .eq("id", id);

  if (error) {
    return NextResponse.json(bilingualError("Update failed", "فشل التحديث"), { status: 500 });
  }

  return NextResponse.json({ ok: true, images: nextImages, image_url });
}
