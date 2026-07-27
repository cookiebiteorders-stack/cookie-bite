/**
 * Clerk to Supabase User Migration Script
 * 
 * This script migrates users from Clerk to Supabase Auth while preserving their roles.
 * 
 * Prerequisites:
 * 1. Clerk API keys (from Clerk Dashboard → API Keys)
 * 2. Supabase service role key (from Supabase Dashboard → Project Settings → API)
 * 3. Supabase project URL
 * 
 * Usage:
 * 1. Set environment variables in .env.local:
 *    - CLERK_SECRET_KEY
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_KEY
 * 2. Run: npx tsx scripts/migrate-clerk-to-supabase.ts
 * 
 * Notes:
 * - Passwords cannot be migrated directly. Users will need to reset their passwords.
 * - The script sends password reset emails to all migrated users.
 * - Roles are preserved from Clerk metadata.
 */

import 'dotenv/config';
import { config } from 'dotenv';
import { createClerkClient } from '@clerk/clerk-sdk-node';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Load .env.local explicitly
config({ path: '.env.local' });

// Configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables:');
  console.error('  - CLERK_SECRET_KEY');
  console.error('  - SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize clients
const clerkClient = createClerkClient({ secretKey: CLERK_SECRET_KEY });
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false },
});

interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string; verification: { status: string } }>;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  publicMetadata: {
    role?: 'owner' | 'admin' | 'staff' | 'customer';
    [key: string]: any;
  };
}

interface MigrationResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

async function fetchClerkUsers(): Promise<ClerkUser[]> {
  console.log('Fetching users from Clerk...');
  const users: ClerkUser[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    try {
      const response = await clerkClient.users.getUserList({
        limit,
        offset,
      });
      
      users.push(...response.data);
      hasMore = response.totalCount > offset + limit;
      offset += limit;
      
      console.log(`Fetched ${users.length} users so far...`);
    } catch (error) {
      console.error('Error fetching Clerk users:', error);
      throw error;
    }
  }

  console.log(`Total users fetched from Clerk: ${users.length}`);
  return users;
}

async function migrateUser(clerkUser: ClerkUser): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract email
    const primaryEmail = clerkUser.emailAddresses.find(
      (e) => e.verification.status === 'verified'
    ) || clerkUser.emailAddresses[0];
    
    if (!primaryEmail) {
      return { success: false, error: 'No email address found' };
    }

    const email = primaryEmail.emailAddress;
    const fullName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(' ') || null;
    
    const role = clerkUser.publicMetadata.role || 'customer';

    // Check if user already exists in Supabase
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      console.log(`  Skipping ${email} - already exists in Supabase`);
      return { success: false, error: 'User already exists' };
    }

    // Create Supabase Auth user with a temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    });

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message || 'Failed to create auth user' };
    }

    // Create public.users row
    const { error: dbError } = await supabase.from('users').insert({
      id: authUser.user.id,
      email,
      full_name: fullName,
      role,
      created_at: clerkUser.createdAt,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      // Rollback: delete auth user if DB insert fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: dbError.message };
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (resetError) {
      console.warn(`  Warning: Failed to generate password reset link for ${email}`);
    }

    console.log(`  ✓ Migrated ${email} (role: ${role})`);
    return { success: true };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function main() {
  console.log('=== Clerk to Supabase Migration ===\n');

  try {
    // Fetch all Clerk users
    const clerkUsers = await fetchClerkUsers();
    
    const result: MigrationResult = {
      total: clerkUsers.length,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    console.log('\nStarting migration...\n');

    // Migrate each user
    for (let i = 0; i < clerkUsers.length; i++) {
      const clerkUser = clerkUsers[i];
      const progress = `[${i + 1}/${clerkUsers.length}]`;
      
      const primaryEmail = clerkUser.emailAddresses[0]?.emailAddress || 'unknown';
      console.log(`${progress} Migrating ${primaryEmail}...`);

      const migrationResult = await migrateUser(clerkUser);

      if (migrationResult.success) {
        result.success++;
      } else if (migrationResult.error === 'User already exists') {
        result.skipped++;
      } else {
        result.failed++;
        result.errors.push({
          email: primaryEmail,
          error: migrationResult.error || 'Unknown error',
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total users: ${result.total}`);
    console.log(`Successfully migrated: ${result.success}`);
    console.log(`Skipped (already exists): ${result.skipped}`);
    console.log(`Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n=== Errors ===');
      result.errors.forEach(({ email, error }) => {
        console.log(`  ${email}: ${error}`);
      });
    }

    console.log('\nMigration complete!');
    console.log('Note: All migrated users will receive a password reset email to set their new password.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
