import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { createSignedCloudinaryUpload } from "@/lib/cloudinary/signed-upload-params";
import type { CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";
import { bilingualError } from "@/lib/validations";

/** توقيع رفع مباشر من المتصفح إلى Cloudinary (يتجاوز حد حجم جسم Route Handler). */
export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const body = (await req.json().catch(() => null)) as { kind?: string } | null;
  const kindRaw = String(body?.kind ?? "image").toLowerCase();
  const kind: CloudinaryUploadKind = kindRaw === "video" ? "video" : "image";

  const signed = createSignedCloudinaryUpload(kind);
  if (!signed) {
    return NextResponse.json(
      bilingualError("Cloudinary is not configured", "Cloudinary غير مُعدّ"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, upload: signed });
}
