/**
 * Script to release stock for past cancelled/unpaid orders
 * This fixes inventory for orders that were cancelled or deleted before stock release was implemented
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function releaseStockForPastOrders() {
  console.log('Starting stock release for past cancelled/unpaid orders...');

  // Find all cancelled orders with unpaid status
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_code, payment_status, status, created_at')
    .in('status', ['cancelled', 'refunded'])
    .eq('payment_status', 'unpaid')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching orders:', error);
    process.exit(1);
  }

  console.log(`Found ${orders.length} cancelled/unpaid orders to process`);

  let successCount = 0;
  let failCount = 0;

  for (const order of orders) {
    try {
      const { error: rpcError } = await supabase.rpc('release_stock_for_order', {
        p_order_id: order.id, // Use UUID, not order_code
      });

      if (rpcError) {
        console.error(`Failed to release stock for order ${order.order_code}:`, rpcError.message);
        failCount++;
      } else {
        console.log(`✓ Released stock for order ${order.order_code}`);
        successCount++;
      }
    } catch (err) {
      console.error(`Error processing order ${order.order_code}:`, err);
      failCount++;
    }

    // Small delay to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\nSummary:`);
  console.log(`- Success: ${successCount}`);
  console.log(`- Failed: ${failCount}`);
  console.log(`- Total: ${orders.length}`);
}

releaseStockForPastOrders().catch(console.error);
