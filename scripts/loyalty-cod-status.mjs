#!/usr/bin/env node
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

loadProjectEnv();
getSupabaseManagementConfig();

const sql = `
  select
    count(*) filter (where payment_method = 'cod' and payment_status <> 'paid')::int as cod_unpaid,
    count(*) filter (where payment_method = 'cod' and payment_status = 'paid')::int as cod_paid,
    count(*) filter (where payment_status = 'paid' and user_id is not null)::int as paid_with_user,
    count(*) filter (where order_type = 'gift_box')::int as gift_box_orders
  from public.orders;
`;

const rows = extractRows(
  await runDatabaseQuery(sql, { readOnly: true, label: "loyalty-cod-status" }),
);
console.log(JSON.stringify(rows[0] ?? {}, null, 2));
