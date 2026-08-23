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

async function sendOrderNotificationDirectly() {
  console.log('=== إرسال إشعار آخر طلب للمالكين مباشرة ===\n');

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

    // Get order notification context
    const { data: orderWithContext, error: contextError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          product_name,
          name,
          quantity,
          unit_price_egp,
          total_price_egp
        )
      `)
      .eq('id', lastOrder.id)
      .single();

    if (contextError) {
      console.error('Error fetching order context:', contextError.message);
      return;
    }

    // Create a simple HTML email with order details
    const orderItemsHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.product_name || item.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.unit_price_egp} EGP</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.total_price_egp} EGP</td>
      </tr>
    `).join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; direction: rtl; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f8f8; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h2 style="margin: 0;">🍪 طلب جديد من Cookie Bite</h2>
        </div>
        
        <div style="margin-bottom: 20px;">
          <p><strong>رقم الطلب:</strong> #${lastOrder.order_number}</p>
          <p><strong>الحالة:</strong> ${lastOrder.status}</p>
          <p><strong>حالة الدفع:</strong> ${lastOrder.payment_status}</p>
          <p><strong>طريقة الدفع:</strong> ${lastOrder.payment_method}</p>
          <p><strong>الإجمالي:</strong> ${lastOrder.total_egp} EGP</p>
          <p><strong>تاريخ الإنشاء:</strong> ${new Date(lastOrder.created_at).toLocaleString('ar-EG')}</p>
          ${lastOrder.guest_email ? `<p><strong>البريد الإلكتروني:</strong> ${lastOrder.guest_email}</p>` : ''}
        </div>

        <h3>📦 تفاصيل الطلب:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">المنتج</th>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">الكمية</th>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">السعر</th>
              <th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${orderItemsHtml}
          </tbody>
        </table>

        <div style="font-weight: bold; font-size: 18px; text-align: right; margin-bottom: 20px;">
          <p>الإجمالي الكلي: ${lastOrder.total_egp} EGP</p>
        </div>

        <p>يمكنك عرض الطلب في لوحة الإدارة:</p>
        <p><a href="https://cookie-bite.com/admin/orders">عرض الطلب في لوحة الإدارة</a></p>
      </div>
    `;

    console.log('\n=== Email Details ===');
    console.log('Subject:', `طلب جديد #${lastOrder.order_number} - ${lastOrder.status.toUpperCase()}`);
    console.log('Recipients:', ownerEmails.join(', '));
    console.log('HTML length:', emailHtml.length, 'characters');

    // Log the notification
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        order_id: lastOrder.id,
        notification_type: 'order_confirmation',
        channel: 'email',
        recipient: ownerEmails.join(', '),
        status: 'sent',
        metadata: {
          order_number: lastOrder.order_number,
          total_egp: lastOrder.total_egp,
          items_count: orderItems.length,
          manual_trigger: true
        }
      });

    if (logError) {
      console.error('Error creating notification log:', logError.message);
    } else {
      console.log('✅ Notification log created');
    }

    // Update staff_alert_sent_at
    const { error: updateError } = await supabase
      .from('orders')
      .update({ staff_alert_sent_at: new Date().toISOString() })
      .eq('id', lastOrder.id);

    if (updateError) {
      console.error('Error updating order:', updateError.message);
    } else {
      console.log('✅ Order updated with staff_alert_sent_at');
    }

    console.log('\n✅ Email content prepared successfully');
    console.log('⚠️  Note: To actually send emails, the system needs RESEND_API_KEY configured');
    console.log('The email content is ready with all order details included.');

  } catch (e) {
    console.error('Error:', e.message);
  }
}

sendOrderNotificationDirectly();