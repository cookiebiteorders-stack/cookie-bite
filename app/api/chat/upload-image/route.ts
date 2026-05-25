import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { uploadChatImageFile } from "@/lib/chat/image-attachments";
import { bilingualError } from "@/lib/validations";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const fileValue = form?.get("file");
  const contextRaw = String(form?.get("context") ?? "store").toLowerCase();
  const context = contextRaw === "admin" ? "admin" : "store";

  if (context === "admin") {
    try {
      await requireAdminAccess("dashboard");
    } catch (resp) {
      if (resp instanceof Response) return resp;
      throw resp;
    }
  }

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      bilingualError("File is required", "الملف مطلوب"),
      { status: 400 },
    );
  }

  try {
    const uploaded = await uploadChatImageFile(fileValue, context);
    return NextResponse.json({
      ok: true,
      url: uploaded.url,
      public_id: uploaded.public_id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json(
      bilingualError(msg, msg.includes("large") ? "الصورة كبيرة جداً" : "فشل رفع الصورة"),
      { status: 400 },
    );
  }
}
