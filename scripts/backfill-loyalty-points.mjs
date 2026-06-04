#!/usr/bin/env node
/**
 * يمنح نقاط الولاء لطلبات paid سابقة لم تُسجَّل لها معاملة earned.
 *
 * Usage:
 *   node scripts/backfill-loyalty-points.mjs --dry-run
 *   node scripts/backfill-loyalty-points.mjs
 *   npm run loyalty:backfill
 */
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") };
}

function computePoints(totalEgp, orderType) {
  const base = Math.max(1, Math.floor(Number(totalEgp) / 10));
  const doubled = orderType === "gift_box";
  return { points: doubled ? base * 2 : base, doubled };
}

function resolveTier(totalPoints) {
  if (totalPoints >= 1000) return "cookie_monster";
  if (totalPoints >= 500) return "cruncher";
  return "cookie_lover";
}

async function main() {
  const projectRoot = process.cwd();
  loadProjectEnv(projectRoot);
  getSupabaseManagementConfig();
  const { dryRun } = parseArgs(process.argv.slice(2));

  const pendingSql = `
    select o.id, o.user_id, o.total_egp, o.order_type, o.order_code, o.payment_method
    from public.orders o
    where o.payment_status = 'paid'
      and o.user_id is not null
      and not exists (
        select 1 from public.loyalty_transactions lt
        join public.loyalty_accounts la on la.id = lt.account_id
        where lt.order_id = o.id and lt.type = 'earned'
      )
    order by o.created_at asc
    limit 500;
  `;

  const data = await runDatabaseQuery(pendingSql, {
    readOnly: true,
    label: "loyalty-backfill-list",
  });
  const rows = extractRows(data);
  console.log(`[loyalty:backfill] pending orders: ${rows.length}${dryRun ? " (dry-run)" : ""}`);

  if (rows.length === 0) {
    console.log("[loyalty:backfill] nothing to do (all paid orders already have earned txns).");
  }

  let awarded = 0;
  let skipped = 0;

  for (const row of rows) {
    const orderId = String(row.id);
    const userId = String(row.user_id);
    const totalEgp = Number(row.total_egp ?? 0);
    const orderType = row.order_type ?? "standard";
    const { points, doubled } = computePoints(totalEgp, orderType);
    const code = row.order_code ?? orderId.slice(0, 8);

    if (dryRun) {
      console.log(
        `  would award ${points} pts${doubled ? " (×2 gift)" : ""} — order ${code} user ${userId.slice(0, 8)}…`,
      );
      awarded += 1;
      continue;
    }

    const esc = (s) => String(s).replace(/'/g, "''");

    const accountRes = await runDatabaseQuery(
      `select id, total_points, lifetime_points from public.loyalty_accounts where user_id = '${esc(userId)}' limit 1;`,
      { readOnly: true, label: "loyalty-account" },
    );
    let accountRows = extractRows(accountRes);
    let accountId = accountRows[0]?.id;

    if (!accountId) {
      const referral = `CB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await runDatabaseQuery(
        `insert into public.loyalty_accounts (user_id, referral_code)
         values ('${esc(userId)}', '${referral}')
         on conflict (user_id) do nothing;`,
        { label: "loyalty-account-create" },
      );
      const again = await runDatabaseQuery(
        `select id, total_points, lifetime_points from public.loyalty_accounts where user_id = '${esc(userId)}' limit 1;`,
        { readOnly: true, label: "loyalty-account-retry" },
      );
      accountRows = extractRows(again);
      accountId = accountRows[0]?.id;
    }

    if (!accountId) {
      console.warn(`  skip ${code}: no loyalty account`);
      skipped += 1;
      continue;
    }

    const prevTotal = Number(accountRows[0].total_points ?? 0);
    const prevLifetime = Number(accountRows[0].lifetime_points ?? 0);
    const nextTotal = prevTotal + points;
    const nextLifetime = prevLifetime + points;
    const tier = resolveTier(nextTotal);

    const descEn = doubled
      ? `Earned ${points} pts (gift box ×2) [backfill]`
      : `Earned ${points} pts from order [backfill]`;
    const descAr = doubled
      ? `حصلت على ${points} نقطة (صندوق هدايا ×2) [استرجاع]`
      : `حصلت على ${points} نقطة من الطلب [استرجاع]`;

    await runDatabaseQuery(
      `update public.loyalty_accounts
       set total_points = ${nextTotal},
           lifetime_points = ${nextLifetime},
           tier = '${tier}'::public.loyalty_tier
       where id = '${esc(accountId)}';`,
      { label: "loyalty-account-update" },
    );

    await runDatabaseQuery(
      `insert into public.loyalty_transactions
         (account_id, type, points, description_en, description_ar, order_id)
       values (
         '${esc(accountId)}',
         'earned'::public.loyalty_txn_type,
         ${points},
         '${esc(descEn)}',
         '${esc(descAr)}',
         '${esc(orderId)}'
       );`,
      { label: "loyalty-txn-insert" },
    );

    console.log(`  awarded ${points} pts — ${code}`);
    awarded += 1;
  }

  const codUnpaidSql = `
    select count(*)::int as c from public.orders
    where payment_method = 'cod' and payment_status <> 'paid';
  `;
  const codData = await runDatabaseQuery(codUnpaidSql, {
    readOnly: true,
    label: "cod-unpaid-count",
  });
  const codRows = extractRows(codData);
  const codUnpaid = Number(codRows[0]?.c ?? codRows[0]?.C ?? 0);

  console.log(`[loyalty:backfill] done — awarded=${awarded} skipped=${skipped}`);
  console.log(
    `[loyalty:backfill] COD not paid yet: ${codUnpaid} — mark paid in /admin/orders then re-run this script.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
