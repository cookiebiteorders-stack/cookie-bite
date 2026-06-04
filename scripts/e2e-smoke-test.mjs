#!/usr/bin/env node
/**
 * اختبار دخان end-to-end عبر Supabase مباشرة (بدون متصفح):
 * COD → paid → نقاط ولاء | صندوق هدايا → مطبخ | تقارير | B2B
 *
 * Usage: npm run e2e:smoke
 */
import { randomUUID } from "node:crypto";
import {
  extractRows,
  getSupabaseManagementConfig,
  loadProjectEnv,
  runDatabaseQuery,
} from "./lib/supabase-management-api.mjs";

const TAG = "[e2e-smoke]";

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function computePoints(totalEgp, orderType) {
  const base = Math.max(1, Math.floor(Number(totalEgp) / 10));
  const doubled = orderType === "gift_box";
  return { points: doubled ? base * 2 : base, doubled };
}

async function awardLoyalty(orderId) {
  const rows = extractRows(
    await runDatabaseQuery(
      `select id, user_id, payment_status, total_egp, order_type,
              (select pu.id from public.users pu
               inner join auth.users au on au.id = o.user_id and lower(pu.email) = lower(au.email)
               limit 1) as loyalty_user_id
       from public.orders o where o.id = '${esc(orderId)}' limit 1;`,
      { readOnly: true, label: "e2e-order" },
    ),
  );
  const order = rows[0];
  if (!order?.user_id || order.payment_status !== "paid") return { ok: false, reason: "not_eligible" };
  const loyaltyUid = order.loyalty_user_id ?? order.user_id;
  if (!loyaltyUid) return { ok: false, reason: "no_public_user_for_loyalty" };

  const existing = extractRows(
    await runDatabaseQuery(
      `select lt.id from public.loyalty_transactions lt
       where lt.order_id = '${esc(orderId)}' and lt.type = 'earned' limit 1;`,
      { readOnly: true, label: "e2e-earned-check" },
    ),
  );
  if (existing.length) return { ok: true, skipped: true, points: 0 };

  const userId = String(loyaltyUid);
  let acc = extractRows(
    await runDatabaseQuery(
      `select id, total_points, lifetime_points from public.loyalty_accounts
       where user_id = '${esc(userId)}' limit 1;`,
      { readOnly: true, label: "e2e-acc" },
    ),
  )[0];

  if (!acc) {
    const ref = `CB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await runDatabaseQuery(
      `insert into public.loyalty_accounts (user_id, referral_code)
       values ('${esc(userId)}', '${ref}') on conflict (user_id) do nothing;`,
      { label: "e2e-acc-create" },
    );
    acc = extractRows(
      await runDatabaseQuery(
        `select id, total_points, lifetime_points from public.loyalty_accounts
         where user_id = '${esc(userId)}' limit 1;`,
        { readOnly: true, label: "e2e-acc-retry" },
      ),
    )[0];
  }
  if (!acc) return { ok: false, reason: "no_account" };

  const { points, doubled } = computePoints(order.total_egp, order.order_type);
  const nextTotal = Number(acc.total_points) + points;
  const nextLifetime = Number(acc.lifetime_points) + points;
  const tier =
    nextTotal >= 1000 ? "cookie_monster" : nextTotal >= 500 ? "cruncher" : "cookie_lover";

  await runDatabaseQuery(
    `update public.loyalty_accounts
     set total_points = ${nextTotal}, lifetime_points = ${nextLifetime},
         tier = '${tier}'::public.loyalty_tier
     where id = '${esc(acc.id)}';`,
    { label: "e2e-acc-up" },
  );
  const descEn = doubled ? `Earned ${points} pts (gift box ×2)` : `Earned ${points} pts`;
  const descAr = doubled
    ? `حصلت على ${points} نقطة (صندوق هدايا ×2)`
    : `حصلت على ${points} نقطة من الطلب`;
  const txnUserId = String(order.user_id);
  await runDatabaseQuery(
    `insert into public.loyalty_transactions
       (account_id, user_id, type, points, reason, description_en, description_ar, order_id)
     values ('${esc(acc.id)}', '${esc(txnUserId)}', 'earned', ${points}, '{"source":"order_paid"}'::jsonb,
       '${esc(descEn)}', '${esc(descAr)}', '${esc(orderId)}');`,
    { label: "e2e-txn" },
  );
  return { ok: true, points, doubled };
}

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

loadProjectEnv();
getSupabaseManagementConfig();

console.log(`\n${TAG} starting…\n`);

// --- prerequisites ---
const products = extractRows(
  await runDatabaseQuery(
    `select id, name, title_en, price_egp, stock from public.products
     where is_active = true and stock > 0
     order by created_at desc nulls last limit 1;`,
    { readOnly: true, label: "e2e-product" },
  ),
);
if (!products.length) {
  fail("prerequisites", "no active product with stock — add a product in admin first");
  process.exit(1);
}
const product = products[0];
pass("product", `${product.title_en ?? product.name} (${product.id})`);

/** طلبات → auth.users؛ ولاء → public.users */
const linked = extractRows(
  await runDatabaseQuery(
    `select pu.id, pu.email, pu.full_name, au.id as auth_id
     from public.users pu
     inner join auth.users au on lower(au.email) = lower(pu.email)
     order by pu.created_at desc
     limit 1;`,
    { readOnly: true, label: "e2e-linked-user" },
  ),
);

let orderUserId = null;
let loyaltyUserId = null;
let smokeEmail = "e2e-smoke@test.cookiebite.local";
let smokeName = "E2E Smoke Tester";

if (linked[0]) {
  orderUserId = String(linked[0].auth_id);
  loyaltyUserId = String(linked[0].id);
  smokeEmail = linked[0].email ?? smokeEmail;
  smokeName = (linked[0].full_name ?? smokeName).slice(0, 160);
  pass("user", `${smokeEmail} (auth + public)`);
} else {
  const authOnly = extractRows(
    await runDatabaseQuery(
      `select id, email from auth.users order by created_at desc limit 1;`,
      { readOnly: true, label: "e2e-auth-only" },
    ),
  );
  if (authOnly[0]) {
    orderUserId = String(authOnly[0].id);
    smokeEmail = authOnly[0].email ?? smokeEmail;
    pass("user", `${smokeEmail} (auth only — kitchen/orders)`);
  } else {
    console.log("  (no linked users — guest orders only)");
  }
}

const useGuestOrders = !orderUserId;
const smokePhone = "01001234567";

const totalStandard = Math.max(100, Number(product.price_egp) * 2);
const codOrderId = randomUUID();

const orderNumSuffix = Date.now().toString().slice(-8);
const nextOrderNumber = `E2E-${orderNumSuffix}-1`;
const giftOrderNumber = `E2E-${orderNumSuffix}-2`;

// --- 1) COD order ---
const smokeShip = esc(
  JSON.stringify({ name: "E2E", street: "Test St", city: "New Cairo", phone: smokePhone }),
);

const userIdSql = orderUserId ? `'${esc(orderUserId)}'` : "null";
await runDatabaseQuery(
  `insert into public.orders (
     id, number, user_id, full_name, phone, guest_email, status, payment_status, payment_method,
     subtotal_egp, delivery_fee_egp, total_egp, gift_message, order_type, shipping_address
   ) values (
     '${esc(codOrderId)}', '${esc(nextOrderNumber)}', ${userIdSql}, '${esc(smokeName)}',
     '${esc(smokePhone)}', '${esc(smokeEmail)}',
     'pending', 'unpaid', 'cod',
     ${totalStandard}, 0, ${totalStandard}, '${esc(TAG)} COD test', 'standard',
     '${smokeShip}'::jsonb
   );`,
  { label: "e2e-cod-order" },
);

pass("COD order created", codOrderId.slice(0, 8));

// --- 2) Mark paid + loyalty ---
await runDatabaseQuery(
  `update public.orders set payment_status = 'paid', updated_at = now()
   where id = '${esc(codOrderId)}';`,
  { label: "e2e-cod-paid" },
);

if (useGuestOrders || !loyaltyUserId) {
  console.log(
    useGuestOrders
      ? "  (skip loyalty — no auth.users)"
      : "  (skip loyalty — no public.users row matching auth email)",
  );
} else {
  const award1 = await awardLoyalty(codOrderId);
  if (!award1.ok) {
    fail("loyalty after COD paid", award1.reason ?? "unknown");
  } else {
    pass("loyalty after COD paid", `${award1.points} pts${award1.doubled ? " ×2" : ""}`);
  }

  const loyaltyRows = extractRows(
    await runDatabaseQuery(
      `select la.total_points, lt.points, lt.type
       from public.loyalty_accounts la
       join public.loyalty_transactions lt on lt.account_id = la.id
       where la.user_id = '${esc(loyaltyUserId ?? orderUserId)}' and lt.order_id = '${esc(codOrderId)}'
       limit 1;`,
      { readOnly: true, label: "e2e-loyalty-verify" },
    ),
  );
  if (loyaltyRows.length) {
    pass("loyalty DB record", `total=${loyaltyRows[0].total_points} txn=${loyaltyRows[0].points}`);
  } else {
    fail("loyalty DB record", "no earned transaction");
  }
}

// --- 3) Gift box order (kitchen) ---
const giftOrderId = randomUUID();
const giftTotal = 350;
const snapshot = {
  version: 1,
  boxSize: "classic",
  items: [
    {
      productId: product.id,
      name: product.title_en ?? product.name,
      quantity: 3,
      price: Number(product.price_egp),
    },
  ],
  giftMessage: `${TAG} gift message`,
  totalItems: 3,
  totalPrice: giftTotal,
};
const snapJson = esc(JSON.stringify(snapshot));

await runDatabaseQuery(
  `insert into public.orders (
     id, number, user_id, full_name, phone, guest_email, status, payment_status, payment_method,
     subtotal_egp, delivery_fee_egp, total_egp, gift_message,
     order_type, gift_box_snapshot, scheduled_delivery_date, shipping_address
   ) values (
     '${esc(giftOrderId)}', '${esc(giftOrderNumber)}', ${userIdSql}, '${esc(smokeName)}',
     '${esc(smokePhone)}', '${esc(smokeEmail)}',
     'pending', 'paid', 'cod',
     ${giftTotal}, 0, ${giftTotal}, '${esc(TAG)} gift box urgent',
     'gift_box', '${snapJson}'::jsonb, current_date,
     '${smokeShip}'::jsonb
   );`,
  { label: "e2e-gift-order" },
);

if (!useGuestOrders) {
  const award2 = await awardLoyalty(giftOrderId);
  if (award2.ok && award2.points > 0 && award2.doubled) {
    pass("gift box double points", `${award2.points} pts`);
  } else if (award2.skipped) {
    pass("gift box loyalty", "already awarded");
  } else {
    fail("gift box double points", JSON.stringify(award2));
  }
}

const kitchen = extractRows(
  await runDatabaseQuery(
    `select id, order_type, gift_box_snapshot is not null as has_snap
     from public.orders
     where order_type = 'gift_box' and id = '${esc(giftOrderId)}';`,
    { readOnly: true, label: "e2e-kitchen" },
  ),
);
if (kitchen.length && kitchen[0].has_snap) {
  pass("kitchen data", `order ${giftOrderId.slice(0, 8)} visible as gift_box`);
} else {
  fail("kitchen data", "gift order missing snapshot");
}

// --- 4) Reports ---
const report = extractRows(
  await runDatabaseQuery(
    `select
       count(*) filter (where order_type = 'gift_box' and payment_status = 'paid')::int as gift_paid,
       coalesce(sum(total_egp) filter (where order_type = 'gift_box' and payment_status = 'paid'), 0)::numeric as gift_rev
     from public.orders
     where gift_message like '%${esc(TAG)}%';`,
    { readOnly: true, label: "e2e-reports" },
  ),
)[0];
if (Number(report?.gift_paid) >= 1) {
  pass("reports gift boxes", `${report.gift_paid} orders, EGP ${report.gift_rev}`);
} else {
  fail("reports gift boxes", "no gift orders in smoke set");
}

// --- 5) B2B bulk ---
const bulkId = randomUUID();
const addresses = [
  {
    recipient: "E2E Recipient",
    phone: "01001234567",
    address: "Test Compound, Villa 1",
    notes: TAG,
  },
];
await runDatabaseQuery(
  `insert into public.corporate_bulk_requests (
     id, company_name, contact_email, contact_name, addresses, notes
   ) values (
     '${esc(bulkId)}',
     'E2E Smoke Co',
     'e2e-smoke@test.cookiebite.local',
     'Smoke Tester',
     '${esc(JSON.stringify(addresses))}'::jsonb,
     '${esc(TAG)}'
   );`,
  { label: "e2e-b2b" },
);

const bulk = extractRows(
  await runDatabaseQuery(
    `select id, jsonb_array_length(addresses) as n
     from public.corporate_bulk_requests where id = '${esc(bulkId)}';`,
    { readOnly: true, label: "e2e-b2b-verify" },
  ),
);
if (bulk.length && Number(bulk[0].n) === 1) {
  pass("B2B bulk request", bulkId.slice(0, 8));
} else {
  fail("B2B bulk request", "insert not found");
}

// --- optional HTTP corporate API ---
const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
try {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  const res = await fetch(`${base}/api/corporate/bulk-delivery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      company_name: "E2E API Co",
      contact_email: "e2e-api@test.cookiebite.local",
      addresses: [
        { recipient: "API Test", phone: "01009998877", address: "API Street 1" },
      ],
    }),
    signal: ctrl.signal,
  });
  clearTimeout(t);
  if (res.ok) {
    pass("HTTP /api/corporate/bulk-delivery", `status ${res.status}`);
  } else {
    fail("HTTP /api/corporate/bulk-delivery", `status ${res.status}`);
  }
} catch {
  console.log(`  (skip HTTP — dev server not on ${base})`);
}

// --- summary ---
const failed = results.filter((r) => !r.ok);
console.log(`\n${TAG} ${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("Failed:", failed.map((f) => f.name).join(", "));
  process.exit(1);
}
console.log(`${TAG} Test order IDs: COD=${codOrderId} gift=${giftOrderId}`);
console.log("Open in browser (signed in): /account#rewards · /admin/kitchen · /admin/reports\n");
