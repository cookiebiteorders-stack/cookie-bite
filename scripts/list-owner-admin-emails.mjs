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

async function listOwnerAdminEmails() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, full_name')
    .in('role', ['owner', 'admin'])
    .order('role', { ascending: true });
  
  if (error) {
    console.error('Error fetching users:', error);
    process.exit(1);
  }
  
  console.log('=== Owner and Admin Emails ===');
  console.log('');
  
  if (data && data.length > 0) {
    data.forEach(user => {
      console.log(`Role: ${user.role.toUpperCase()}`);
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.full_name || 'N/A'}`);
      console.log(`ID: ${user.id}`);
      console.log('---');
    });
  } else {
    console.log('No owners or admins found in the database.');
  }
  
  // Also check environment variables
  console.log('');
  console.log('=== Environment Variable Emails ===');
  console.log(`OWNER_BOOTSTRAP_EMAIL: ${process.env.OWNER_BOOTSTRAP_EMAIL || 'Not set'}`);
  console.log(`ADMIN_BOOTSTRAP_EMAILS: ${process.env.ADMIN_BOOTSTRAP_EMAILS || 'Not set'}`);
  console.log(`STORE_OPS_EMAIL: ${process.env.STORE_OPS_EMAIL || 'Not set'}`);
}

listOwnerAdminEmails();