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

async function checkOrderEmails() {
  console.log('=== فحص إيميلات الطلبات الأخيرة ===\n');

  // Get recent orders
  try {
    const { data: recentOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError.message);
      return;
    }

    if (!recentOrders || recentOrders.length === 0) {
      console.log('No recent orders found');
      return;
    }

    console.log(`آخر ${recentOrders.length} طلب:\n`);
    
    for (const order of recentOrders) {
      console.log(`طلب #${order.order_number} (${order.id})`);
      console.log(`الحالة: ${order.status} | الدفع: ${order.payment_status}`);
      console.log(`البريد: ${order.guest_email || 'N/A'}`);
      console.log(`التاريخ: ${new Date(order.created_at).toLocaleString('ar-EG')}`);
      console.log(`staff_alert_sent_at: ${order.staff_alert_sent_at || 'Not sent'}`);
      
      // Check notification logs for this order
      const { data: notificationLogs, error: logsError } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });
      
      if (!logsError && notificationLogs && notificationLogs.length > 0) {
        console.log(`\nسجلات الإشعارات لهذا الطلب:`);
        notificationLogs.forEach(log => {
          console.log(`- ${log.notification_type} | ${log.channel} | ${log.recipient} | ${log.status} | ${new Date(log.created_at).toLocaleString('ar-EG')}`);
          if (log.error_message) {
            console.log(`  خطأ: ${log.error_message}`);
          }
        });
      } else {
        console.log(`\nلا توجد سجلات إشعارات لهذا الطلب`);
      }
      
      console.log('---\n');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }

  // Check email logs specifically for order notifications
  console.log('\n=== سجلات الإيميل العامة الأخيرة ===\n');
  
  try {
    const { data: emailLogs, error: emailError } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (emailError) {
      console.error('Error fetching email logs:', emailError.message);
      return;
    }

    if (!emailLogs || emailLogs.length === 0) {
      console.log('No recent email logs found');
      return;
    }

    emailLogs.forEach(log => {
      console.log(`${log.recipient} | ${log.template_key || log.email_type} | ${log.status} | ${log.provider} | ${new Date(log.created_at).toLocaleString('ar-EG')}`);
      if (log.order_id) {
        console.log(`  Order ID: ${log.order_id}`);
      }
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
}

checkOrderEmails();