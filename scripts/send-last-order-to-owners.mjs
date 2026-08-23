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

async function sendLastOrderToOwners() {
  console.log('=== إرسال آخر طلب للمالكين ===\n');

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
    console.log(`Total: ${lastOrder.total_egp} EGP`);
    console.log(`Created: ${new Date(lastOrder.created_at).toLocaleString('ar-EG')}`);
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
      console.log(`${index + 1}. ${item.product_name || item.name}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Unit Price: ${item.unit_price_egp} EGP`);
      console.log(`   Total: ${item.total_price_egp} EGP`);
    });

    // Get owner emails
    const { data: owners, error: ownersError } = await supabase
      .from('users')
      .select('email')
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

    // Create email content
    const emailSubject = `New Order #${lastOrder.order_number} - ${lastOrder.status.toUpperCase()}`;
    
    let emailBody = `
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f8f8; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .order-info { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total { font-weight: bold; font-size: 18px; text-align: right; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🍪 طلب جديد من Cookie Bite</h2>
        </div>
        
        <div class="order-info">
            <p><strong>رقم الطلب:</strong> #${lastOrder.order_number}</p>
            <p><strong>الحالة:</strong> ${lastOrder.status}</p>
            <p><strong>حالة الدفع:</strong> ${lastOrder.payment_status}</p>
            <p><strong>طريقة الدفع:</strong> ${lastOrder.payment_method}</p>
            <p><strong>الإجمالي:</strong> ${lastOrder.total_egp} EGP</p>
            <p><strong>تاريخ الإنشاء:</strong> ${new Date(lastOrder.created_at).toLocaleString('ar-EG')}</p>
            ${lastOrder.guest_email ? `<p><strong>البريد الإلكتروني:</strong> ${lastOrder.guest_email}</p>` : ''}
        </div>

        <h3>📦 تفاصيل الطلب:</h3>
        <table class="items-table">
            <thead>
                <tr>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                </tr>
            </thead>
            <tbody>
`;

    orderItems.forEach(item => {
      emailBody += `
                <tr>
                    <td>${item.product_name || item.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.unit_price_egp} EGP</td>
                    <td>${item.total_price_egp} EGP</td>
                </tr>`;
    });

    emailBody += `
            </tbody>
        </table>

        <div class="total">
            <p>الإجمالي الكلي: ${lastOrder.total_egp} EGP</p>
        </div>

        <p>يمكنك عرض الطلب في لوحة الإدارة:</p>
        <p><a href="https://cookie-bite.com/admin/orders">عرض الطلب في لوحة الإدارة</a></p>
    </div>
</body>
</html>`;

    console.log('\n=== Email Content ===');
    console.log('Subject:', emailSubject);
    console.log('Body length:', emailBody.length, 'characters');

    // Here you would integrate with your email provider
    // For now, just show what would be sent
    console.log('\n=== Would send to: ===');
    ownerEmails.forEach(email => {
      console.log(`- ${email}`);
    });

    console.log('\n⚠️  To actually send the email, you need to integrate with your email provider (Resend, SMTP, etc.)');
    console.log('The email content is ready and would be sent to all owners.');

  } catch (e) {
    console.error('Error:', e.message);
  }
}

sendLastOrderToOwners();