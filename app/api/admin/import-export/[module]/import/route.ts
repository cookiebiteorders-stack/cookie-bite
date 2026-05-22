import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import {
  moduleNotFoundResponse,
  parseModuleParam,
  readImportMultipart,
} from "@/lib/admin/import-export/api-helpers";
import { commitModuleImport } from "@/lib/admin/import-export/import-service";
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
    const result = await commitModuleImport({
      module: moduleKey,
      actor,
      fileName,
      mimeType,
      buffer,
      mapping,
      request: req,
    });
    return NextResponse.json({ ok: result.status !== "failed", ...result });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 400 });
  }
}
