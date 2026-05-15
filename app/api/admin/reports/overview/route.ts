import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import {
  type AnalyticsRangePreset,
  getAnalyticsDashboard,
} from "@/services/analytics";

function toRangePreset(value: string | null): AnalyticsRangePreset {
  if (value === "7d" || value === "30d" || value === "90d" || value === "custom") {
    return value;
  }
  return "30d";
}

export async function GET(request: NextRequest) {
  const actor = await requireAdminAccess("analytics");

  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Supabase not configured";
    return NextResponse.json(
      {
        ...bilingualError("Could not load analytics", "تعذر تحميل التحليلات"),
        details: message,
        ...(actor.role === "owner" && process.env.NODE_ENV === "development"
          ? { debug: { error: message } }
          : {}),
      },
      { status: 503 },
    );
  }

  const params = request.nextUrl.searchParams;
  const segmentParam = params.get("segment");
  const segment =
    segmentParam === "guest" || segmentParam === "registered" ? segmentParam : "all";

  try {
    const data = await getAnalyticsDashboard(supabase, {
      range: toRangePreset(params.get("range")),
      from: params.get("from"),
      to: params.get("to"),
      product: params.get("product"),
      category: params.get("category"),
      segment,
    });

    return NextResponse.json({
      ...data,
      actor: {
        role: actor.role,
        permission: actor.permission,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load analytics";
    const body: Record<string, unknown> = {
      ...bilingualError("Could not load analytics", "تعذر تحميل التحليلات"),
      details: message,
    };
    if (actor.role === "owner") {
      body.debug = {
        error: message,
      };
    }
    return NextResponse.json(body, { status: 500 });
  }
}

