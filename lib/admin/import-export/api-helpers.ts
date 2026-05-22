import { NextRequest } from "next/server";
import { z } from "zod";
import { isValidImportExportModule } from "@/lib/admin/import-export/module-registry";
import type { ModuleKey } from "@/lib/admin/rbac";
import { bilingualError } from "@/lib/validations";

export function parseModuleParam(module: string): ModuleKey | null {
  if (!isValidImportExportModule(module)) return null;
  return module;
}

export function moduleNotFoundResponse() {
  return Response.json(bilingualError("Unknown module", "وحدة غير معروفة"), { status: 404 });
}

const mappingSchema = z.record(z.string(), z.string());

export async function readImportMultipart(req: NextRequest): Promise<{
  buffer: Buffer;
  fileName: string;
  mimeType: string | null;
  mapping: Record<string, string>;
}> {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    throw new Response(
      JSON.stringify(bilingualError("Missing file", "الملف مطلوب")),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }
  const mappingRaw = form.get("mapping");
  let mapping: Record<string, string> = {};
  if (typeof mappingRaw === "string" && mappingRaw.trim()) {
    try {
      const parsed = JSON.parse(mappingRaw);
      const m = mappingSchema.safeParse(parsed);
      if (m.success) mapping = m.data;
    } catch {
      /* ignore */
    }
  }
  const buf = Buffer.from(await file.arrayBuffer());
  return {
    buffer: buf,
    fileName: file.name,
    mimeType: file.type || null,
    mapping,
  };
}
