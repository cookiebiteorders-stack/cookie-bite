import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { IMPORT_EXPORT_STORAGE_BUCKET } from "@/lib/admin/import-export/constants";

export async function uploadImportFile(params: {
  module: string;
  logId: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const safeName = params.fileName.replace(/[^\w.\-]+/g, "_").slice(0, 120);
  const path = `${params.module}/${params.logId}/${safeName}`;

  const { error } = await supabase.storage
    .from(IMPORT_EXPORT_STORAGE_BUCKET)
    .upload(path, params.buffer, {
      contentType: params.contentType,
      upsert: false,
    });

  if (error) {
    console.warn("[import-export] storage upload skipped:", error.message);
    return null;
  }
  return path;
}

export async function createSignedDownloadUrl(
  storagePath: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(IMPORT_EXPORT_STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSec);
  if (error) return null;
  return data.signedUrl;
}
