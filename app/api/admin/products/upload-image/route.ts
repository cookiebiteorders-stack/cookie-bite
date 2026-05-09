import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  requireAdminAccess,
  requireWritePermission,
} from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function cloudinaryConfig() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

function cloudinarySignature(params: Record<string, string>, apiSecret: string) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(`${base}${apiSecret}`).digest("hex");
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("products");
  requireWritePermission(actor);

  const cfg = cloudinaryConfig();
  if (!cfg) {
    return NextResponse.json(
      bilingualError(
        "Cloudinary is not configured",
        "Cloudinary غير مُعدّ بشكل صحيح",
      ),
      { status: 500 },
    );
  }

  const form = await req.formData().catch(() => null);
  const fileValue = form?.get("file");
  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      bilingualError("Image file is required", "ملف الصورة مطلوب"),
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(fileValue.type)) {
    return NextResponse.json(
      bilingualError(
        "Only JPG/PNG/WEBP/GIF are allowed",
        "الأنواع المسموح بها: JPG/PNG/WEBP/GIF فقط",
      ),
      { status: 400 },
    );
  }

  if (fileValue.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      bilingualError("Image is too large (max 6MB)", "حجم الصورة كبير (الحد الأقصى 6MB)"),
      { status: 400 },
    );
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = "cookie-bite/products";
  const signedParams = { folder, timestamp };
  const signature = cloudinarySignature(signedParams, cfg.apiSecret);

  const uploadBody = new FormData();
  uploadBody.append("file", fileValue);
  uploadBody.append("folder", folder);
  uploadBody.append("timestamp", timestamp);
  uploadBody.append("api_key", cfg.apiKey);
  uploadBody.append("signature", signature);

  const cloudRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`,
    {
      method: "POST",
      body: uploadBody,
    },
  );

  const cloudJson = (await cloudRes.json().catch(() => null)) as
    | {
        secure_url?: string;
        public_id?: string;
        bytes?: number;
        error?: { message?: string };
      }
    | null;

  if (!cloudRes.ok || !cloudJson?.secure_url) {
    return NextResponse.json(
      bilingualError(
        cloudJson?.error?.message || "Image upload failed",
        "فشل رفع الصورة",
      ),
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    image: {
      url: cloudJson.secure_url,
      public_id: cloudJson.public_id ?? null,
      bytes: cloudJson.bytes ?? null,
    },
  });
}

