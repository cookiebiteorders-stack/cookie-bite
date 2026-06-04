import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { bilingualError } from "@/lib/validations";
import { buildIlikeOrClause } from "@/lib/security/sanitize-filter";
import { deriveSeverity, type AuditLogRow } from "@/lib/admin/audit-display";

const querySchema = z.object({
  module: z.string().optional(),
  action: z.string().optional(),
  actor_id: z.string().uuid().optional(),
  entity_id: z.string().optional(),
  search: z.string().max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  preset: z
    .enum(["all", "failedLogins", "criticalShipping", "last24h", "suspiciousIps"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

type ParsedQuery = z.infer<typeof querySchema>;

/** Postgrest filter chain — typed loosely because builder shape changes after `.select()`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyAuditFilters(query: any, q: ParsedQuery) {
  if (q.preset === "failedLogins") {
    query = query.ilike("action", "%failed%");
  } else if (q.preset === "criticalShipping") {
    query = query.eq("module", "shipping");
  } else if (q.preset === "last24h" || q.preset === "suspiciousIps") {
    const from = new Date(Date.now() - 24 * 3600000).toISOString();
    query = query.gte("created_at", from);
  }
  if (q.module) query = query.eq("module", q.module);
  if (q.action) query = query.ilike("action", `%${q.action}%`);
  if (q.actor_id) query = query.eq("actor_id", q.actor_id);
  if (q.entity_id) query = query.eq("entity_id", q.entity_id);
  if (q.from) query = query.gte("created_at", q.from);
  if (q.to) query = query.lte("created_at", q.to);
  if (q.search?.trim()) {
    const clause = buildIlikeOrClause(
      ["actor_email", "action", "module", "entity_id", "ip"],
      q.search,
    );
    if (clause) query = query.or(clause);
  }
  return query;
}

async function buildStats(supabase: ReturnType<typeof createSupabaseAdminClient>, q: ParsedQuery) {
  let statsQuery = applyAuditFilters(
    supabase.from("audit_logs").select("action,module,actor_email"),
    q,
  );
  const { data: sample } = await statsQuery
    .order("created_at", { ascending: false })
    .limit(800);

  const rows = (sample ?? []) as Pick<AuditLogRow, "action" | "module" | "actor_email">[];

  let failedAttempts = 0;
  let criticalEvents = 0;
  let highEvents = 0;
  const actors = new Set<string>();
  const moduleCounts = new Map<string, number>();

  for (const row of rows) {
    const action = row.action.toLowerCase();
    if (action.includes("failed")) failedAttempts += 1;
    const sev = deriveSeverity(row);
    if (sev === "critical") criticalEvents += 1;
    if (sev === "high" || sev === "critical") highEvents += 1;
    actors.add(row.actor_email ?? "system");
    moduleCounts.set(row.module, (moduleCounts.get(row.module) ?? 0) + 1);
  }

  const topModules = [...moduleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([module, count]) => ({ module, count }));

  const securityHealth = Math.max(
    32,
    Math.round(100 - (criticalEvents * 12 + highEvents * 5 + failedAttempts * 3)),
  );

  return {
    failedAttempts,
    criticalEvents,
    highEvents,
    uniqueActors: actors.size,
    securityHealth,
    topModules,
    sampleSize: rows.length,
  };
}

export async function GET(req: NextRequest) {
  await requireAdminAccess("audit");

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid query", "بارامترات غير صالحة"),
      { status: 400 },
    );
  }
  const q = parsed.data;

  const supabase = createSupabaseAdminClient();

  const listQuery = applyAuditFilters(
    supabase.from("audit_logs").select("*", { count: "exact" }),
    q,
  ).order("created_at", { ascending: false });

  const offset = (q.page - 1) * q.limit;
  const { data, error, count } = await listQuery.range(offset, offset + q.limit - 1);

  if (error) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  const stats = await buildStats(supabase, q);

  const { data: moduleRows } = await supabase
    .from("audit_logs")
    .select("module")
    .order("created_at", { ascending: false })
    .limit(400);

  const modules = [
    ...new Set((moduleRows ?? []).map((r) => String((r as { module: string }).module))),
  ].sort();

  return NextResponse.json({
    logs: data ?? [],
    total: count ?? 0,
    page: q.page,
    limit: q.limit,
    stats,
    modules,
  });
}
