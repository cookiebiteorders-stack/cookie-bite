#!/usr/bin/env node
/**
 * حذف بيانات اختبار e2e:smoke من قاعدة البيانات.
 *
 * Usage:
 *   npm run e2e:cleanup          # معاينة فقط
 *   npm run e2e:cleanup -- --apply
 */
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

const TAG = "[e2e-smoke]";
const APPLY = process.argv.includes("--apply");

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function tierForPoints(total) {
  if (total >= 1000) return "cookie_monster";
  if (total >= 500) return "cruncher";
  return "cookie_lover";
}

loadProjectEnv();
getSupabaseManagementConfig();

const orderWhere = `
  gift_message ilike '%${esc(TAG)}%'
  or number like 'E2E-%'
  or lower(coalesce(guest_email, '')) like '%e2e-smoke%'
  or lower(coalesce(guest_email, '')) like '%e2e-api@test.cookiebite.local%'
  or full_name = 'E2E Smoke Tester'
`;

console.log(`\n${TAG} cleanup${APPLY ? " (APPLY)" : " (dry-run)"}…\n`);

const orders = extractRows(
  await runDatabaseQuery(
    `select id, number, payment_status, total_egp, order_type, gift_message, guest_email, created_at
     from public.orders
     where ${orderWhere}
     order by created_at desc;`,
    { readOnly: true, label: "cleanup-list-orders" },
  ),
);

const bulk = extractRows(
  await runDatabaseQuery(
    `select id, company_name, contact_email, created_at
     from public.corporate_bulk_requests
     where notes ilike '%${esc(TAG)}%'
        or company_name in ('E2E Smoke Co', 'E2E API Co')
        or lower(contact_email) like '%e2e-smoke%'
        or lower(contact_email) like '%e2e-api@test.cookiebite.local%'
     order by created_at desc;`,
    { readOnly: true, label: "cleanup-list-bulk" },
  ),
);

const loyaltyTx = orders.length
  ? extractRows(
      await runDatabaseQuery(
        `select lt.id, lt.account_id, lt.order_id, lt.type, lt.points
         from public.loyalty_transactions lt
         where lt.order_id in (
           select id from public.orders where ${orderWhere}
         );`,
        { readOnly: true, label: "cleanup-list-loyalty" },
      ),
    )
  : [];

console.log(`Orders to delete: ${orders.length}`);
for (const o of orders) {
  console.log(`  · ${o.number}  ${o.payment_status}  EGP ${o.total_egp}  ${o.id}`);
}

console.log(`\nLoyalty transactions linked: ${loyaltyTx.length}`);
for (const t of loyaltyTx) {
  console.log(`  · ${t.type} ${t.points} pts  order=${t.order_id?.slice?.(0, 8) ?? t.order_id}`);
}

console.log(`\nB2B bulk requests to delete: ${bulk.length}`);
for (const b of bulk) {
  console.log(`  · ${b.company_name}  ${b.contact_email}  ${b.id}`);
}

if (!orders.length && !bulk.length) {
  console.log("\nNothing to clean up.\n");
  process.exit(0);
}

if (!APPLY) {
  console.log("\nDry-run only. Re-run with: npm run e2e:cleanup -- --apply\n");
  process.exit(0);
}

// Reverse earned points per account before deleting orders
const earnedByAccount = new Map();
for (const t of loyaltyTx) {
  if (t.type !== "earned") continue;
  const prev = earnedByAccount.get(t.account_id) ?? 0;
  earnedByAccount.set(t.account_id, prev + Number(t.points));
}

for (const [accountId, pointsToRemove] of earnedByAccount) {
  const acc = extractRows(
    await runDatabaseQuery(
      `select id, total_points, lifetime_points from public.loyalty_accounts
       where id = '${esc(accountId)}' limit 1;`,
      { readOnly: true, label: "cleanup-acc" },
    ),
  )[0];
  if (!acc) continue;
  const nextTotal = Math.max(0, Number(acc.total_points) - pointsToRemove);
  const nextLifetime = Math.max(0, Number(acc.lifetime_points) - pointsToRemove);
  const tier = tierForPoints(nextTotal);
  await runDatabaseQuery(
    `update public.loyalty_accounts
     set total_points = ${nextTotal},
         lifetime_points = ${nextLifetime},
         tier = '${tier}'::public.loyalty_tier
     where id = '${esc(accountId)}';`,
    { label: "cleanup-acc-points" },
  );
  console.log(`Reversed ${pointsToRemove} pts on account ${accountId.slice(0, 8)}… → total=${nextTotal}`);
}

if (loyaltyTx.length) {
  await runDatabaseQuery(
    `delete from public.loyalty_transactions
     where order_id in (select id from public.orders where ${orderWhere});`,
    { label: "cleanup-loyalty-tx" },
  );
}

if (orders.length) {
  await runDatabaseQuery(
    `delete from public.orders where ${orderWhere};`,
    { label: "cleanup-orders" },
  );
}

if (bulk.length) {
  const bulkIds = bulk.map((b) => `'${esc(b.id)}'`).join(", ");
  await runDatabaseQuery(
    `delete from public.corporate_bulk_requests where id in (${bulkIds});`,
    { label: "cleanup-bulk" },
  );
}

console.log(
  `\n${TAG} deleted ${orders.length} order(s), ${loyaltyTx.length} loyalty txn(s), ${bulk.length} B2B request(s).\n`,
);
