const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSchemaAndError() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('=== Checking order_items schema ===');
  const { data: columns, error: columnsError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = 'order_items'
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

  if (columnsError) {
    console.error('Error checking columns:', columnsError);
  } else {
    console.log('order_items columns:', columns);
  }

  console.log('\n=== Testing simple insert ===');
  const { data: insertResult, error: insertError } = await supabase
    .rpc('exec_sql', {
      sql: `
        DO $$
        DECLARE
          v_test_order_id uuid;
        BEGIN
          -- Create a test order
          INSERT INTO public.orders (
            user_id,
            guest_email,
            status,
            payment_status,
            payment_method,
            subtotal_egp,
            delivery_fee_egp,
            total_egp,
            shipping_address,
            notes,
            order_code,
            currency,
            full_name,
            phone,
            email,
            created_at,
            updated_at
          )
          VALUES (
            NULL,
            'test@example.com',
            'pending',
            'unpaid',
            'card',
            100.00,
            10.00,
            110.00,
            '{"name":"Test","phone":"01234567890"}'::jsonb,
            'Test order',
            'TEST-001',
            'EGP',
            'Test User',
            '01234567890',
            'test@example.com',
            now(),
            now()
          )
          RETURNING id INTO v_test_order_id;

          -- Try to insert an order item
          INSERT INTO public.order_items (
            order_id,
            product_id,
            slug,
            product_name,
            quantity,
            unit_price_egp,
            addons_total_egp,
            final_total_egp,
            product_snapshot,
            variant_id,
            variant_snapshot,
            selected_addons,
            created_at
          )
          VALUES (
            v_test_order_id,
            NULL,
            'test-product',
            'Test Product',
            1,
            100.00,
            0.00,
            100.00,
            '{"id":"test","name":"Test"}'::jsonb,
            NULL,
            NULL::jsonb,
            '[]'::jsonb,
            now()
          );

          RAISE NOTICE 'Insert successful for order_id: %', v_test_order_id;
          
          -- Clean up
          DELETE FROM public.order_items WHERE order_id = v_test_order_id;
          DELETE FROM public.orders WHERE id = v_test_order_id;
          
        EXCEPTION
          WHEN OTHERS THEN
            RAISE NOTICE 'Insert failed: %', SQLERRM;
        END $$;
      `
    });

  if (insertError) {
    console.error('Error testing insert:', insertError);
  } else {
    console.log('Insert test result:', insertResult);
  }

  console.log('\n=== Checking function definition ===');
  const { data: functionDef, error: functionError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT 
          proname,
          prosrc
        FROM pg_proc
        WHERE proname = 'create_checkout_order_transactional'
        LIMIT 1;
      `
    });

  if (functionError) {
    console.error('Error checking function:', functionError);
  } else {
    console.log('Function definition found:', functionDef ? 'YES' : 'NO');
  }
}

checkSchemaAndError().catch(console.error);
