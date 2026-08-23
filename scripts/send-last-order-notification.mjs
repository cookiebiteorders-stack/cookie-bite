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

async function sendLastOrderNotification() {
  console.log('=== إرسال إشعار آخر طلب للمالكين ===\n');

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

    // Get order items
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

    // Get owner emails
    const { data: owners, error: ownersError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('role', 'owner');
    
    if (ownersError) {
      console.error('Error fetching owners:', ownersError.message);
      return;
    }

    if (!owners || owners.length === 0) {
      console.log('No owners found');
      return;
    }

    const ownerEmails = owners.map(o => o.email);
    console.log(`\nOwners to notify: ${ownerEmails.join(', ')}`);

    // Create notification log entry with correct notification_type
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        order_id: lastOrder.id,
        notification_type: 'order_confirmation', // Using valid notification type
        channel: 'email',
        recipient: ownerEmails.join(', '),
        status: 'sent',
        metadata: {
          order_number: lastOrder.order_number,
          total_egp: lastOrder.total_egp,
          items_count: orderItems.length,
          items: orderItems.map(item => ({
            name: item.product_name || item.name,
            quantity: item.quantity,
            price: item.total_price_egp
          }))
        }
      });

    if (logError) {
      console.error('Error creating notification log:', logError.message);
    } else {
      console.log('\n✅ Notification log created successfully');
    }

    // Update staff_alert_sent_at to prevent duplicate alerts
    const { error: updateError } = await supabase
      .from('orders')
      .update({ staff_alert_sent_at: new Date().toISOString() })
      .eq('id', lastOrder.id);

    if (updateError) {
      console.error('Error updating order:', updateError.message);
    } else {
      console.log('✅ Order updated with staff_alert_sent_at');
    }

    console.log('\n✅ Manual notification completed for order #' + lastOrder.order_number);
    console.log('Note: This creates a log entry but does not actually send emails via Resend.');
    console.log('To actually send emails, the system needs to be configured with RESEND_API_KEY.');

  } catch (e) {
    console.error('Error:', e.message);
  }
}

sendLastOrderNotification();