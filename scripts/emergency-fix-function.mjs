const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeEmergencyFix() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const sql = `
    DROP FUNCTION IF EXISTS public.create_checkout_order_transactional CASCADE;
  `;

  console.log('Dropping existing function...');
  const { error: dropError } = await supabase.rpc('exec_sql', { sql });
  if (dropError) {
    console.error('Drop error:', dropError);
  } else {
    console.log('Function dropped successfully');
  }

  console.log('Reading migration file...');
  const fs = require('fs');
  const migrationSql = fs.readFileSync('./supabase/migrations/0123_emergency_force_recreate_function.sql', 'utf8');

  console.log('Executing migration...');
  const { error: createError } = await supabase.rpc('exec_sql', { sql: migrationSql });
  if (createError) {
    console.error('Create error:', createError);
    process.exit(1);
  } else {
    console.log('Function created successfully');
  }
}

executeEmergencyFix().catch(console.error);
