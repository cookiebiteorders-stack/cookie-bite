import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import {
  moduleNotFoundResponse,
  parseModuleParam,
  readImportMultipart,
} from "@/lib/admin/import-export/api-helpers";
import { previewModuleImport } from "@/lib/admin/import-export/import-service";
import { getModuleConfig } from "@/lib/admin/import-export/module-registry";
import { bilingualError } from "@/lib/validations";

type Params = { params: Promise<{ module: string }> };

export async function POST(req: NextRequest, ctx: Params) {
  const { module: mod } = await ctx.params;
  const moduleKey = parseModuleParam(mod);
  if (!moduleKey) return moduleNotFoundResponse();

  const config = getModuleConfig(moduleKey);
  if (!config?.importEnabled) {
    return NextResponse.json(bilingualError("Import disabled", "الاستيراد معطّل"), { status: 400 });
  }

  const actor = await requireAdminAccess(moduleKey);
  requireWritePermission(actor);

  try {
    const { buffer, fileName, mimeType, mapping } = await readImportMultipart(req);
    const preview = await previewModuleImport({
      module: moduleKey,
      fileName,
      mimeType,
      buffer,
      mapping: Object.keys(mapping).length ? mapping : undefined,
    });
    return NextResponse.json({ ok: true, ...preview });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Preview failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 400 });
  }
}
