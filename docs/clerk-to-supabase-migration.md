# Clerk to Supabase User Migration Guide

This guide explains how to migrate users from Clerk to Supabase Auth while preserving their roles.

## Overview

The migration script:
- Fetches all users from Clerk
- Creates Supabase Auth accounts for each user
- Creates corresponding rows in `public.users` table
- Preserves roles from Clerk metadata
- Sends password reset emails to migrated users

## Prerequisites

### 1. Clerk API Credentials

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to your application
3. Go to **API Keys** (in the left sidebar)
4. Copy the **Secret Key** (starts with `sk_live_` or `sk_test_`)

### 2. Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **service_role** key (starts with `eyJhbGci...`)

### 3. Install Dependencies

```bash
npm install
```

This will install `@clerk/clerk-sdk-node` which was added to package.json.

## Migration Steps

### Step 1: Set Environment Variables

Create a `.env.local` file (or add to existing `.env`):

```bash
# Clerk
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** Never commit these values to git. Use `.env.local` for local development.

### Step 2: Backup Your Data

Before running the migration, create a backup of your Supabase database:

```bash
npm run backup:supabase
```

### Step 3: Test with a Small Batch (Recommended)

Before migrating all users, test with a small batch first:

1. Modify the script to limit the number of users (around line 60):
   ```typescript
   const limit = 5; // Change from 100 to 5 for testing
   ```

2. Run the migration:
   ```bash
   npm run migrate:clerk-to-supabase
   ```

3. Verify the test users:
   - Check Supabase Dashboard → Authentication → Users
   - Check Supabase Dashboard → Database → public.users table
   - Try signing in with a test user using the password reset email

4. If everything works, revert the limit back to 100.

### Step 4: Run Full Migration

```bash
npm run migrate:clerk-to-supabase
```

The script will:
- Fetch all users from Clerk
- Migrate each user to Supabase
- Display progress and summary
- Report any errors

### Step 5: Verify Migration

After the migration completes:

1. **Check user count**:
   - Clerk user count vs Supabase user count
   - They should match (minus any skipped duplicates)

2. **Verify roles**:
   ```sql
   SELECT role, COUNT(*) FROM public.users GROUP BY role;
   ```
   - Compare with Clerk role distribution

3. **Test authentication**:
   - Try signing in with a migrated user
   - Use the password reset email they received
   - Verify role-based access works

## Important Notes

### Password Migration

**Passwords cannot be migrated directly** from Clerk to Supabase due to security and technical limitations. The migration script:

1. Creates each user with a temporary random password
2. Sends a password reset email (magic link) to each user
3. Users must set their new password via the reset link

### Email Verification

The script automatically marks emails as verified in Supabase if they were verified in Clerk.

### Role Mapping

Roles are preserved from Clerk's `publicMetadata.role` field:
- `owner` → `owner`
- `admin` → `admin`
- `staff` → `staff`
- `customer` (or missing) → `customer`

### Duplicate Users

If a user with the same email already exists in Supabase, the script will skip that user and report it in the summary.

## Troubleshooting

### Error: "Missing required environment variables"

Make sure you have set:
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

### Error: "Failed to create auth user"

This could be due to:
- Invalid Supabase credentials
- Rate limiting (add more delay between migrations)
- Email already exists in Supabase Auth

### Error: "Failed to generate password reset link"

This is a warning, not a critical error. The user was created but the reset link failed. You can manually trigger a password reset from the Supabase Dashboard.

### Rate Limiting

If you encounter rate limiting errors, increase the delay in the script (line ~140):
```typescript
await new Promise(resolve => setTimeout(resolve, 500)); // Increase from 100 to 500ms
```

## Post-Migration Steps

### 1. Update Clerk Integration

After successful migration:
- Remove Clerk SDK from your application
- Remove Clerk environment variables
- Update any remaining Clerk references

### 2. Run Database Migration

Run the migration to drop Clerk columns:
```bash
npm run supabase:migrate
```

This will execute:
- `0085_drop_clerk_columns.sql` - Drops `clerk_user_id` column and fixes RLS policies
- `0086_drop_clerk_generated_columns.sql` - Drops temporary generated columns

### 3. Monitor for Issues

- Watch for authentication errors in logs
- Monitor user complaints about login issues
- Check that role-based permissions work correctly

## Rollback Plan

If you need to rollback:

1. Delete migrated users from Supabase:
   ```sql
   DELETE FROM public.users WHERE created_at >= '2024-01-01'; -- Adjust date
   -- Note: This will also delete from auth.users due to FK cascade
   ```

2. Restore from backup:
   ```bash
   npm run backup:supabase:restore
   ```

## Support

If you encounter issues:
1. Check the error messages in the migration output
2. Review Supabase logs: Dashboard → Logs
3. Review Clerk Dashboard for user data
4. Check that your environment variables are correct
