import { createSupabaseAdminClient, tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { APP_DATABASE_TABLES } from "@/lib/db/app-tables";

export type TableProbeResult = {
  table: string;
  ok: boolean;
  error?: string;
};

export type SchemaHealthReport = {
  ok: boolean;
  configured: boolean;
  missing_tables: string[];
  failed_tables: string[];
  probes: TableProbeResult[];
};

function isMissingTableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    (m.includes("relation") && m.includes("does not exist")) ||
    (m.includes("schema cache") && m.includes("could not find"))
  );
}

/** Probe each app table via PostgREST (service role). */
export async function probeAppDatabaseTables(): Promise<SchemaHealthReport> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      configured: false,
      missing_tables: [...APP_DATABASE_TABLES],
      failed_tables: [],
      probes: [],
    };
  }

  const probes: TableProbeResult[] = [];
  const missing_tables: string[] = [];
  const failed_tables: string[] = [];

  for (const table of APP_DATABASE_TABLES) {
    const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (!error) {
      probes.push({ table, ok: true });
      continue;
    }
    const msg = error.message ?? String(error);
    if (isMissingTableError(msg)) {
      missing_tables.push(table);
      probes.push({ table, ok: false, error: msg });
    } else {
      failed_tables.push(table);
      probes.push({ table, ok: false, error: msg });
    }
  }

  return {
    ok: missing_tables.length === 0 && failed_tables.length === 0,
    configured: true,
    missing_tables,
    failed_tables,
    probes,
  };
}

/** Verify `is_admin_or_owner()` exists (required for RLS on many tables). */
export async function probeAdminRlsHelper(): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return { ok: false, error: "Supabase not configured" };
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("is_admin_or_owner");
  if (!error) return { ok: true };
  const msg = error.message ?? "";
  if (msg.includes("does not exist") || msg.includes("Could not find")) {
    return { ok: false, error: "Function public.is_admin_or_owner() missing — run migration 0007_5" };
  }
  return { ok: true };
}
