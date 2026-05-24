import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { uploadToCloudinary, type CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";
import { bilingualError } from "@/lib/validations";

export const runtime = "nodejs";
export const maxDuration = 120;

/** رفع عبر الخادم (احتياطي) — يُفضَّل الرفع المباشر عبر /upload-media/sign */
export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
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
    const uploaded = await uploadToCloudinary(fileValue, kind);
    return NextResponse.json({
      ok: true,
      kind,
      [kind]: {
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
