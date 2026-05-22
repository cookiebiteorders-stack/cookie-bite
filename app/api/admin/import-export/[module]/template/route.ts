import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  moduleNotFoundResponse,
  parseModuleParam,
} from "@/lib/admin/import-export/api-helpers";
import { buildTemplateCsv } from "@/lib/admin/import-export/export-service";
import { getModuleConfig } from "@/lib/admin/import-export/module-registry";
import { bilingualError } from "@/lib/validations";

type Params = { params: Promise<{ module: string }> };

export async function GET(_req: Request, ctx: Params) {
  const { module: mod } = await ctx.params;
  const moduleKey = parseModuleParam(mod);
  if (!moduleKey) return moduleNotFoundResponse();

  const config = getModuleConfig(moduleKey);
  if (!config?.importEnabled || !config.templateColumns.length) {
    return NextResponse.json(bilingualError("No template", "لا يوجد قالب"), { status: 400 });
  }

  await requireAdminAccess(moduleKey);
  const csv = buildTemplateCsv(config);
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${moduleKey}-import-template.csv"`,
    },
  });
}
