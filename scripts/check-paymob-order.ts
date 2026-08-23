import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env
const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join("=").trim();
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ORDER_CODE = "CB-89B6BA";

async function checkOrder() {
  console.log(`=== Checking Order ${ORDER_CODE} ===\n`);

  // First, get recent orders to see the structure
  const { data: recentOrders, error: recentError } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (recentError) {
    console.error("Error fetching recent orders:", recentError);
    return;
  }

  console.log("Recent Orders (to see structure):");
  recentOrders.forEach((o: any, i: number) => {
    console.log(`\nOrder ${i + 1}:`);
    console.log("- ID:", o.id);
    console.log("- Status:", o.status);
    console.log("- Payment Status:", o.payment_status);
    console.log("- Created At:", o.created_at);
    // Show all available keys
    console.log("- Available fields:", Object.keys(o).join(", "));
  });

  // Now try to find the specific order by looking through recent orders
  const order = recentOrders.find((o: any) => 
    o.id?.includes(ORDER_CODE) || 
    o.code?.includes(ORDER_CODE) ||
    o.display_code?.includes(ORDER_CODE) ||
    o.order_code?.includes(ORDER_CODE)
  );

  if (!order) {
    console.log(`\nOrder ${ORDER_CODE} not found in recent orders by code`);
    console.log(`Checking the most recent order (from today 23 Aug) instead...`);
    // Use the most recent order as fallback since it's from today
    const mostRecent = recentOrders[0];
    if (mostRecent) {
      console.log(`Using order from ${mostRecent.created_at}`);
      checkOrderDetails(mostRecent);
    }
    return;
  }

  console.log(`\n=== Found Order ${ORDER_CODE} ===\n`);
  checkOrderDetails(order);
}

async function checkOrderDetails(order: any) {
  console.log("Order Details:");
  console.log("- ID:", order.id);
  console.log("- Order Code:", order.order_code);
  console.log("- Status:", order.status);
  console.log("- Payment Status:", order.payment_status);
  console.log("- Paymob Accept Order ID:", order.paymob_accept_order_id);
  console.log("- Paymob Transaction ID:", order.paymob_transaction_id);
  console.log("- Total:", order.total);
  console.log("- Created At:", order.created_at);
  console.log();

  // 2. Check webhook events for this order
  const { data: webhookEvents, error: webhookError } = await supabase
    .from("paymob_webhook_events")
    .select("*")
    .gte("created_at", order.created_at)
    .order("created_at", { ascending: false })
    .limit(10);

  if (webhookError) {
    console.error("Error fetching webhook events:", webhookError);
  } else {
    console.log(`Webhook Events (last 10 since ${order.created_at}):`);
    if (webhookEvents.length === 0) {
      console.log("- No webhook events found");
    } else {
      webhookEvents.forEach((event, i) => {
        console.log(`\nEvent ${i + 1}:`);
        console.log("- Paymob Order ID:", event.paymob_order_id);
        console.log("- Paymob Transaction ID:", event.paymob_transaction_id);
        console.log("- HMAC Verified:", event.hmac_verified);
        console.log("- Processed:", event.processed);
        console.log("- Matched Order ID:", event.matched_order_id);
        console.log("- Error Message:", event.error_message);
        console.log("- Created At:", event.created_at);
      });
    }
  }

  console.log();

  // 3. Check payments table
  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  if (paymentsError) {
    console.error("Error fetching payments:", paymentsError);
  } else {
    console.log(`Payments for Order ${ORDER_CODE}:`);
    if (payments.length === 0) {
      console.log("- No payments found");
    } else {
      payments.forEach((payment, i) => {
        console.log(`\nPayment ${i + 1}:`);
        console.log("- ID:", payment.id);
        console.log("- Amount:", payment.amount);
        console.log("- Currency:", payment.currency);
        console.log("- Method:", payment.method);
        console.log("- Status:", payment.status);
        console.log("- Provider:", payment.provider);
        console.log("- Provider Transaction ID:", payment.provider_transaction_id);
        console.log("- Created At:", payment.created_at);
      });
    }
  }
}

checkOrder().catch(console.error);
