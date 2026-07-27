/**
 * Add Orphaned Users to Supabase Auth
 * 
 * This script creates Supabase Auth accounts for users that exist in public.users
 * but not in auth.users (legacy users from Clerk era).
 * 
 * Prerequisites:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 * 
 * Usage:
 * 1. Set environment variables in .env.local
 * 2. Run: npx tsx scripts/add-orphaned-users-to-auth.ts
 * 
 * Notes:
 * - Users will receive password reset emails to set their passwords
 * - Their existing roles and data will be preserved
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Load .env.local explicitly
config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('  - SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false },
});

interface OrphanedUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

async function fetchOrphanedUsers(): Promise<OrphanedUser[]> {
  console.log('Fetching orphaned users from public.users...');
  
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .order('created_at');

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  // Filter users that don't exist in auth.users
  const orphanedUsers: OrphanedUser[] = [];
  
  for (const user of data || []) {
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
    
    if (authError || !authUser.user) {
      orphanedUsers.push(user);
    }
  }

  console.log(`Found ${orphanedUsers.length} orphaned users`);
  return orphanedUsers;
}

async function createUserInAuth(user: OrphanedUser): Promise<{ success: boolean; error?: string }> {
  try {
    // Create Supabase Auth user with a temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        role: user.role,
      },
      // Use the existing ID from public.users
      id: user.id,
    });

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message || 'Failed to create auth user' };
    }

    console.log(`  ✓ Created auth account for ${user.email} (ID: ${user.id})`);

    // Send password reset email
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    });

    if (resetError) {
      console.warn(`  Warning: Failed to generate password reset link for ${user.email}`);
    } else {
      console.log(`  ✓ Password reset email sent to ${user.email}`);
    }

    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function main() {
  console.log('=== Add Orphaned Users to Supabase Auth ===\n');

  try {
    // Fetch orphaned users
    const orphanedUsers = await fetchOrphanedUsers();
    
    if (orphanedUsers.length === 0) {
      console.log('No orphaned users found. All users are already in auth.users.');
      return;
    }

    console.log('\nOrphaned users to migrate:');
    orphanedUsers.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.email} (${user.role}) - ID: ${user.id}`);
    });

    console.log('\nStarting migration...\n');

    const result = {
      total: orphanedUsers.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ email: string; error: string }>,
    };

    // Migrate each user
    for (let i = 0; i < orphanedUsers.length; i++) {
      const user = orphanedUsers[i];
      const progress = `[${i + 1}/${orphanedUsers.length}]`;
      
      console.log(`${progress} Migrating ${user.email}...`);

      const migrationResult = await createUserInAuth(user);

      if (migrationResult.success) {
        result.success++;
      } else {
        result.failed++;
        result.errors.push({
          email: user.email,
          error: migrationResult.error || 'Unknown error',
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total users: ${result.total}`);
    console.log(`Successfully migrated: ${result.success}`);
    console.log(`Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n=== Errors ===');
      result.errors.forEach(({ email, error }) => {
        console.log(`  ${email}: ${error}`);
      });
    }

    if (result.success > 0) {
      console.log('\nMigration complete!');
      console.log('All migrated users will receive password reset emails.');
      console.log('After they set their passwords, you can validate the FK constraint.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
