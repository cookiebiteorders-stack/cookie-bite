import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  moduleNotFoundResponse,
  parseModuleParam,
} from "@/lib/admin/import-export/api-helpers";
import { exportModuleData } from "@/lib/admin/import-export/export-service";
import { getModuleConfig } from "@/lib/admin/import-export/module-registry";
import type { ExportFormat, ExportScope } from "@/lib/admin/import-export/types";
import { bilingualError } from "@/lib/validations";

type Params = { params: Promise<{ module: string }> };

export async function GET(req: NextRequest, ctx: Params) {
  const { module: mod } = await ctx.params;
  const moduleKey = parseModuleParam(mod);
  if (!moduleKey) return moduleNotFoundResponse();

  const config = getModuleConfig(moduleKey);
  if (!config?.exportEnabled) {
    return NextResponse.json(bilingualError("Export disabled", "التصدير معطّل"), { status: 400 });
  }

  const actor = await requireAdminAccess(moduleKey);
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "csv") as ExportFormat;
  const scope = (url.searchParams.get("scope") ?? "filtered") as ExportScope;
  const idsParam = url.searchParams.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : undefined;
  const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
  const dateTo = url.searchParams.get("dateTo") ?? undefined;
  const download = url.searchParams.get("download") === "1";

  if (!["csv", "xlsx", "pdf"].includes(format)) {
    return NextResponse.json(bilingualError("Invalid format", "صيغة غير صالحة"), { status: 400 });
  }

  try {
    const result = await exportModuleData({
      module: moduleKey,
      actor,
      query: { format, scope, ids, dateFrom, dateTo },
      request: req,
    });

    if (download) {
      return new NextResponse(new Uint8Array(result.buffer), {
        status: 200,
        headers: {
          "Content-Type": result.mimeType,
          "Content-Disposition": `attachment; filename="${result.fileName}"`,
          "X-Export-Log-Id": result.logId,
          "X-Row-Count": String(result.rowCount),
        },
      });
    }

    return NextResponse.json({
      ok: true,
      logId: result.logId,
      format: result.format,
      rowCount: result.rowCount,
      fileName: result.fileName,
      mimeType: result.mimeType,
      dataBase64: result.dataBase64,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    const msg = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 400 });
  }
}
