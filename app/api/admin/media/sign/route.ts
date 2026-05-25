import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { createSignedCloudinaryUpload } from "@/lib/cloudinary/signed-upload-params";
import type { CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";
import { bilingualError } from "@/lib/validations";

const FOLDER_RE = /^cookie-bite\/[a-zA-Z0-9_\-./]+$/;

/** توقيع رفع مباشر من المتصفح إلى Cloudinary (يتجاوز حد حجم جسم Route Handler). */
export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("media");
  requireWritePermission(actor);

  const body = (await req.json().catch(() => null)) as { kind?: string; folder?: string } | null;
  const kindRaw = String(body?.kind ?? "image").toLowerCase();
  const kind: CloudinaryUploadKind = kindRaw === "video" ? "video" : "image";

  const folderRaw = String(body?.folder ?? "").trim();
  const defaultFolder =
    kind === "image" ? "cookie-bite/media" : "cookie-bite/media/videos";
  const folder =
    folderRaw && FOLDER_RE.test(folderRaw)
      ? folderRaw
      : defaultFolder;

  const signed = createSignedCloudinaryUpload(kind, { folder });
  if (!signed) {
    return NextResponse.json(
      bilingualError("Cloudinary is not configured", "Cloudinary غير مُعدّ"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, upload: signed });
}
