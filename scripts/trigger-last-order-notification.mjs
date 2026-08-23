import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function triggerLastOrderNotification() {
  console.log('=== تفعيل إشعار آخر طلب للمالكين ===\n');

  try {
    // Get the last order
    const { data: lastOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (orderError) {
      console.error('Error fetching last order:', orderError.message);
      return;
    }

    if (!lastOrder) {
      console.log('No orders found');
      return;
    }

    console.log(`Order #${lastOrder.order_number} (${lastOrder.id})`);
    console.log(`Status: ${lastOrder.status} | Payment: ${lastOrder.payment_status}`);
    console.log('');

    // Get order items for display
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', lastOrder.id);
    
    if (itemsError) {
      console.error('Error fetching order items:', itemsError.message);
      return;
    }

    if (!orderItems || orderItems.length === 0) {
      console.log('No order items found');
      return;
    }

    console.log('Order Items:');
    orderItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.product_name || item.name} x${item.quantity} - ${item.total_price_egp} EGP`);
    });

    // Reset staff_alert_sent_at to allow notification to be sent
    const { error: resetError } = await supabase
      .from('orders')
      .update({ staff_alert_sent_at: null })
      .eq('id', lastOrder.id);

    if (resetError) {
      console.error('Error resetting staff_alert_sent_at:', resetError.message);
    } else {
      console.log('✅ Reset staff_alert_sent_at to allow notification');
    }

    // Now call the internal API to trigger the notification
    const response = await fetch('http://localhost:3000/api/internal/trigger-order-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_API_SECRET || 'dev-secret',
      },
      body: JSON.stringify({
        orderId: lastOrder.id,
        event: 'created',
        note: 'Manual notification for last order #'+lastOrder.order_number
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ Notification triggered successfully:', result);
    } else {
      console.error('\n❌ Failed to trigger notification:', await response.text());
    }

  } catch (e) {
    console.error('Error:', e.message);
  }
}

triggerLastOrderNotification();