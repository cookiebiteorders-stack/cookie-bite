import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { fetchMediaLibrary } from "@/lib/admin/media-library";
import { uploadToCloudinary, type CloudinaryUploadKind } from "@/lib/cloudinary/admin-upload";
import { bilingualError } from "@/lib/validations";

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
