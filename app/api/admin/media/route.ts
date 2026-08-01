import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { fetchMediaLibrary, loadProductUrlUsage } from "@/lib/admin/media-library";
import {
  removeMediaUrlFromProducts,
  replaceMediaUrlInProducts,
} from "@/lib/admin/media-mutations";
import { uploadToCloudinary, type CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";
import {
  destroyCloudinaryAsset,
  renameCloudinaryAsset,
  replaceCloudinaryAsset,
} from "@/lib/cloudinary/manage-resource";
import { bilingualError } from "@/lib/validations";

export const runtime = "nodejs";
export const maxDuration = 120;

const PUBLIC_ID_RE = /^cookie-bite\/[a-zA-Z0-9_\-./]+$/;

function parseDeleteBody(req: NextRequest) {
  return req.json().catch(() => null) as Promise<{
    url?: string;
    publicId?: string;
    kind?: string;
    unlinkProducts?: boolean;
    force?: boolean;
  } | null>;
}

export async function GET() {
  await requireAdminAccess("media");
  try {
    const library = await fetchMediaLibrary();
    return NextResponse.json({ ok: true, ...library });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load media";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("media");
  requireWritePermission(actor);

  const form = await req.formData().catch(() => null);
  const fileValue = form?.get("file");
  const kindRaw = String(form?.get("kind") ?? "image").toLowerCase();
  const kind: CloudinaryUploadKind = kindRaw === "video" ? "video" : "image";

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      bilingualError("File is required", "الملف مطلوب"),
      { status: 400 },
    );
  }

  try {
    const uploaded = await uploadToCloudinary(fileValue, kind, {
      folder: kind === "image" ? "cookie-bite/media" : "cookie-bite/media/videos",
    });
    return NextResponse.json({
      ok: true,
      kind,
      asset: {
        url: uploaded.url,
        public_id: uploaded.public_id,
        bytes: uploaded.bytes,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    const isConfig = msg.includes("not configured");
    return NextResponse.json(
      bilingualError(msg, isConfig ? "Cloudinary غير مُعدّ" : "فشل الرفع"),
      { status: isConfig ? 500 : 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  const actor = await requireAdminAccess("media");
  requireWritePermission(actor);

  const body = await parseDeleteBody(req);
  const url = String(body?.url ?? "").trim();
  const publicId = String(body?.publicId ?? "").trim();
  const kind: CloudinaryUploadKind = body?.kind === "video" ? "video" : "image";
  const unlinkProducts = Boolean(body?.unlinkProducts);
  const force = Boolean(body?.force);

  if (!url && !publicId) {
    return NextResponse.json(
      bilingualError("url or publicId is required", "الرابط أو معرّف الملف مطلوب"),
      { status: 400 },
    );
  }

  try {
    const library = await fetchMediaLibrary();
    const item =
      library.items.find((i) => (publicId && i.publicId === publicId) || (url && i.url === url)) ??
      null;

    if (item?.usedBy.length && !unlinkProducts && !force) {
      return NextResponse.json(
        bilingualError(
          "Media is used by products — enable unlinkProducts or force",
          "الملف مستخدم في منتجات — فعّل إزالة الربط أو التأكيد القسري",
        ),
        { status: 409 },
      );
    }

    const targetUrl = url || item?.url || "";
    let productsUpdated = 0;
    const shouldUnlink =
      targetUrl && (unlinkProducts || force || !publicId || (item?.usedBy.length ?? 0) > 0);
    if (shouldUnlink) {
      productsUpdated = await removeMediaUrlFromProducts(targetUrl);
    }

    if (publicId) {
      await destroyCloudinaryAsset(publicId, kind);
    }

    return NextResponse.json({
      ok: true,
      productsUpdated,
      destroyed: Boolean(publicId),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json(bilingualError(msg, "فشل الحذف"), { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("media");
  requireWritePermission(actor);

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.includes("multipart/form-data");

  try {
    if (isMultipart) {
      const form = await req.formData();
      const action = String(form.get("action") ?? "replace").toLowerCase();
      if (action !== "replace") {
        return NextResponse.json(bilingualError("Unknown action", "إجراء غير معروف"), {
          status: 400,
        });
      }

      const fileValue = form.get("file");
      const publicId = String(form.get("publicId") ?? "").trim();
      const oldUrl = String(form.get("url") ?? "").trim();
      const kindRaw = String(form.get("kind") ?? "image").toLowerCase();
      const kind: CloudinaryUploadKind = kindRaw === "video" ? "video" : "image";
      const updateProducts = form.get("updateProducts") === "true"; // explicit opt-in only

      if (!(fileValue instanceof File)) {
        return NextResponse.json(bilingualError("File is required", "الملف مطلوب"), {
          status: 400,
        });
      }

      if (publicId) {
        if (!PUBLIC_ID_RE.test(publicId)) {
          return NextResponse.json(
            bilingualError("Invalid public_id", "معرّف الملف غير صالح"),
            { status: 400 },
          );
        }
        const uploaded = await replaceCloudinaryAsset(fileValue, publicId, kind);
        let productsUpdated = 0;
        
        // Check if URL is used by multiple products
        if (updateProducts && oldUrl && uploaded.url !== oldUrl) {
          const usedByCount = await loadProductUrlUsage();
          const usageCount = usedByCount.get(oldUrl)?.length ?? 0;
          
          if (usageCount > 1) {
            return NextResponse.json(
              bilingualError(
                `This asset is used by ${usageCount} products — confirm scope explicitly`,
                `هذا الملف مستخدم في ${usageCount} منتجات — يجب توضيح النطاق صراحةً`
              ),
              { status: 409 }
            );
          }
          
          productsUpdated = await replaceMediaUrlInProducts(oldUrl, uploaded.url);
        }
        
        return NextResponse.json({
          ok: true,
          action: "replace",
          asset: uploaded,
          productsUpdated,
        });
      }

      const uploaded = await uploadToCloudinary(fileValue, kind, {
        folder: kind === "image" ? "cookie-bite/media" : "cookie-bite/media/videos",
      });
      let productsUpdated = 0;
      
      if (updateProducts && oldUrl) {
        const usedByCount = await loadProductUrlUsage();
        const usageCount = usedByCount.get(oldUrl)?.length ?? 0;
        
        if (usageCount > 1) {
          return NextResponse.json(
            bilingualError(
              `This asset is used by ${usageCount} products — confirm scope explicitly`,
              `هذا الملف مستخدم في ${usageCount} منتجات — يجب توضيح النطاق صراحةً`
            ),
            { status: 409 }
          );
        }
        
        productsUpdated = await replaceMediaUrlInProducts(oldUrl, uploaded.url);
      }
      
      return NextResponse.json({
        ok: true,
        action: "replace",
        asset: uploaded,
        productsUpdated,
      });
    }

    const body = (await req.json().catch(() => null)) as {
      action?: string;
      fromPublicId?: string;
      toPublicId?: string;
      oldUrl?: string;
      kind?: string;
      updateProducts?: boolean;
    } | null;

    const action = String(body?.action ?? "").toLowerCase();
    if (action !== "rename") {
      return NextResponse.json(bilingualError("Unknown action", "إجراء غير معروف"), {
        status: 400,
      });
    }

    const fromPublicId = String(body?.fromPublicId ?? "").trim();
    const toPublicId = String(body?.toPublicId ?? "").trim();
    const oldUrl = String(body?.oldUrl ?? "").trim();
    const kind: CloudinaryUploadKind = body?.kind === "video" ? "video" : "image";
    const updateProducts = body?.updateProducts === true; // explicit opt-in only

    if (!fromPublicId || !toPublicId) {
      return NextResponse.json(
        bilingualError("fromPublicId and toPublicId are required", "معرّف المصدر والهدف مطلوبان"),
        { status: 400 },
      );
    }
    if (!PUBLIC_ID_RE.test(fromPublicId) || !PUBLIC_ID_RE.test(toPublicId)) {
      return NextResponse.json(
        bilingualError("public_id must stay under cookie-bite/", "المعرّف يجب أن يبقى تحت cookie-bite/"),
        { status: 400 },
      );
    }

    const renamed = await renameCloudinaryAsset(fromPublicId, toPublicId, kind);
    let productsUpdated = 0;
    if (updateProducts && oldUrl) {
      productsUpdated = await replaceMediaUrlInProducts(oldUrl, renamed.url);
    }

    return NextResponse.json({
      ok: true,
      action: "rename",
      asset: renamed,
      productsUpdated,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json(bilingualError(msg, "فشل التحديث"), { status: 400 });
  }
}
