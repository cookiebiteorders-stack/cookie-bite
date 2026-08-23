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

async function updateOrderToPaid() {
  console.log(`=== Updating Order ${ORDER_CODE} to Paid ===\n`);

  // Find the order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .ilike("order_code", `%${ORDER_CODE}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (orderError || !order) {
    console.error("Error fetching order:", orderError);
    return;
  }

  console.log("Current Order Status:");
  console.log("- ID:", order.id);
  console.log("- Order Code:", order.order_code);
  console.log("- Status:", order.status);
  console.log("- Payment Status:", order.payment_status);
  console.log("- Total:", order.total);
  console.log();

  // Update order to paid
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      status: "confirmed",
      payment_status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("Error updating order:", updateError);
    return;
  }

  console.log("✅ Order updated successfully!");
  console.log("- Status: confirmed");
  console.log("- Payment Status: paid");
  console.log();

  // Record payment in payments table
  const { error: paymentError } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      amount: order.total,
      method: "card",
      status: "paid",
      provider: "paymob",
      provider_transaction_id: order.paymob_accept_order_id?.toString() || "manual_update",
      created_at: new Date().toISOString(),
    });

  if (paymentError) {
    console.error("Error recording payment:", paymentError);
  } else {
    console.log("✅ Payment recorded successfully!");
  }

  console.log("\n=== Update Complete ===");
}

updateOrderToPaid().catch(console.error);
