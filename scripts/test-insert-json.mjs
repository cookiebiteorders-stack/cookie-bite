import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSchemaAndTest() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('=== Checking order_items schema (using PostgreSQL connection) ===');
  
  // Use a different approach - check if we can query the schema directly
  console.log('Note: Skipping schema check for now, proceeding with test');

  console.log('\n=== Testing simple order creation ===');
  
  // First, create a test order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: null,
      guest_email: 'test@example.com',
      status: 'pending',
      payment_status: 'unpaid',
      payment_method: 'card',
      subtotal_egp: 100.00,
      delivery_fee_egp: 10.00,
      total_egp: 110.00,
      shipping_address: { name: 'Test', phone: '01234567890' },
      notes: 'Test order',
      order_code: 'TEST-001',
      currency: 'EGP',
      full_name: 'Test User',
      phone: '01234567890',
      email: 'test@example.com',
    })
    .select()
    .single();

  if (orderError) {
    console.error('Error creating test order:', orderError);
    return;
  }

  console.log('Test order created:', order.id);

  console.log('\n=== Testing order item insert with minimal fields ===');
  
  // Try with only minimal required fields
  const { data: item, error: itemError } = await supabase
    .from('order_items')
    .insert({
      order_id: order.id,
      slug: 'test-product',
      quantity: 1,
      unit_price_egp: 100.00,
    })
    .select()
    .single();

  if (itemError) {
    console.error('Error inserting order item:', itemError);
    console.error('Error details:', JSON.stringify(itemError, null, 2));
  } else {
    console.log('Order item inserted successfully:', item);
    
    // Clean up the item if successful
    await supabase.from('order_items').delete().eq('order_id', order.id);
  }

  // Clean up the order
  console.log('\n=== Cleaning up ===');
  await supabase.from('orders').delete().eq('id', order.id);
  console.log('Cleanup complete');
}

checkSchemaAndTest().catch(console.error);
