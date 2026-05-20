#!/usr/bin/env node
/**
 * يصلح تنبيه Supabase auth_users_exposed عبر Management API (نفس مسار supabase:migrate).
 *
 * المتطلبات: NEXT_PUBLIC_SUPABASE_URL، SUPABASE_ACCESS_TOKEN (صلاحية database read/write)
 *
 * الاستخدام:
 *   node scripts/supabase-fix-auth-users-exposed.mjs --dry-run   # عرض العروض المتأثرة فقط
 *   node scripts/supabase-fix-auth-users-exposed.mjs             # تنفيذ revoke (كملف الترحيل 0024)
 *
 * لتسجيل الترحيل في schema_migrations استخدم: npm run supabase:migrate
 */
import fs from "node:fs";
import path from "node:path";
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

const LIST_SQL = `
select distinct v.view_schema as schema, v.view_name as name, 'view' as kind
from information_schema.view_table_usage v
where v.table_schema = 'auth'
  and v.table_name = 'users'
  and v.view_schema in ('public', 'graphql_public')
union all
select m.schemaname as schema, m.matviewname as name, 'matview' as kind
from pg_matviews m
where m.schemaname in ('public', 'graphql_public')
  and m.definition ilike '%auth.users%'
order by 1, 2;
`;

const dryRun = process.argv.includes("--dry-run");

loadProjectEnv(process.cwd());
const { ref } = getSupabaseManagementConfig();
console.log(`[fix-auth-users-exposed] project ref=${ref}`);

const listed = await runDatabaseQuery(LIST_SQL, { readOnly: true, label: "list-auth-user-views" });
const rows = extractRows(listed);
if (!rows.length) {
  console.log("[fix-auth-users-exposed] لا توجد views/matviews في public/graphql_public تعتمد على auth.users.");
} else {
  console.log("[fix-auth-users-exposed] كائنات ستُزال عنها صلاحيات anon/authenticated:");
  for (const row of rows) {
    console.log(`  - ${row.schema ?? row.SCHEMA}.${row.name ?? row.NAME} (${row.kind ?? row.KIND})`);
  }
}

if (dryRun) {
  console.log("[fix-auth-users-exposed] انتهى الوضع التجريبي (--dry-run) دون تعديل.");
  process.exit(0);
}

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "0024_fix_auth_users_exposed_api_grant.sql",
);
if (!fs.existsSync(migrationPath)) {
  console.error(`✖ ملف الترحيل غير موجود: ${migrationPath}`);
  process.exit(1);
}
const sql = fs.readFileSync(migrationPath, "utf8").trim();
await runDatabaseQuery(sql, { label: "0024_fix_auth_users_exposed_api_grant" });
console.log("[fix-auth-users-exposed] تم تنفيذ revoke عبر واجهة Supabase. راجع Advisors في لوحة التحكم.");
console.log("[fix-auth-users-exposed] لتسجيل الترحيل: npm run supabase:migrate (آمن إذا كان 0024 لم يُطبَّق بعد).");
