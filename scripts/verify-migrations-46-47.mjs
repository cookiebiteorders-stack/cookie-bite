#!/usr/bin/env node
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

loadProjectEnv();
getSupabaseManagementConfig();

const migrations = extractRows(
  await runDatabaseQuery(
    `select version, applied_at from public.schema_migrations
     where version like '0046%' or version like '0047%'
     order by version;`,
    { readOnly: true, label: "verify-migrations" },
  ),
);

const table = extractRows(
  await runDatabaseQuery(
    `select to_regclass('public.corporate_bulk_requests') as exists,
            (select count(*)::int from public.email_event_template_mappings) as email_mappings;`,
    { readOnly: true, label: "verify-tables" },
  ),
);

console.log("Applied migrations:", migrations);
console.log("Checks:", table[0]);
