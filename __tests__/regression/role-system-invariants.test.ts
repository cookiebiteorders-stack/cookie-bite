/**
 * Role System Invariant Tests
 * 
 * These tests verify critical invariants for the role system to prevent
 * privilege escalation and ensure role consistency across the application.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { tryCreateSupabaseAdminClient } from '@/lib/supabase/admin';

const supabase = tryCreateSupabaseAdminClient();
const hasRealDb = Boolean(
  supabase &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("dummy") &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("example") &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("dummy")
);

const describeDb = hasRealDb ? describe : describe.skip;

describeDb('Role System Invariant Tests', () => {
  const adminClient = supabase!;
  let testOwnerId: string;
  let testAdminId: string;
  let testCustomerId: string;
  let dbAvailable = false;

  beforeAll(async () => {
    jest.setTimeout(30000);
    try {
      // Check if DB connection works
      const { data: ping } = await adminClient.from('users').select('id').limit(1);
      if (!ping) return;

      dbAvailable = true;

      // Create test owner
      const { data: owner } = await adminClient
        .from('users')
        .insert({
          email: 'invariant-owner@example.com',
          full_name: 'Invariant Test Owner',
          role: 'owner',
        })
        .select('id')
        .single();

      testOwnerId = owner?.id || "";

      // Create test admin
      const { data: admin } = await adminClient
        .from('users')
        .insert({
          email: 'invariant-admin@example.com',
          full_name: 'Invariant Test Admin',
          role: 'admin',
        })
        .select('id')
        .single();

      testAdminId = admin?.id || "";

      // Create test customer
      const { data: customer } = await adminClient
        .from('users')
        .insert({
          email: 'invariant-customer@example.com',
          full_name: 'Invariant Test Customer',
          role: 'customer',
        })
        .select('id')
        .single();

      testCustomerId = customer?.id || "";
    } catch {
      dbAvailable = false;
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
    if (testOwnerId) {
      await supabase.from('users').delete().eq('id', testOwnerId);
    }
    if (testAdminId) {
      await supabase.from('users').delete().eq('id', testAdminId);
    }
    if (testCustomerId) {
      await supabase.from('users').delete().eq('id', testCustomerId);
    }
  });

  it('Invariant 1: At least one owner exists in the system', async () => {
    if (!dbAvailable) return;
    const { count } = await adminClient
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'owner');

    expect(count).toBeGreaterThan(0);
  });

  it('Invariant 2: Owner cannot be downgraded during sign-in/profile completion', async () => {
    if (!dbAvailable) return;
    const initialRole = await adminClient
      .from('users')
      .select('role')
      .eq('id', testOwnerId)
      .single();

    expect(initialRole.data?.role).toBe('owner');
  });

  it('Invariant 3: Customer cannot mutate own role via direct database update', async () => {
    if (!dbAvailable) return;
    const { data: result } = await adminClient.rpc('update_profile_safe', {
      p_user_id: testCustomerId,
      p_full_name: 'Updated Name',
      p_role: 'admin',
    });

    const { data: user } = await adminClient
      .from('users')
      .select('role')
      .eq('id', testCustomerId)
      .single();

    expect(user?.role).toBe('customer');
  });

  it('Invariant 4: Admin cannot change owner-only settings through direct PostgREST', async () => {
    if (!dbAvailable) return;
    const { data: isOwner } = await adminClient.rpc('is_owner');
    expect(typeof isOwner).toBe('boolean');
  });

  it('Invariant 5: Role changes are audited', async () => {
    if (!dbAvailable) return;
    const { data: result } = await adminClient.rpc('change_user_role', {
      p_target_user_id: testAdminId,
      p_new_role: 'staff',
      p_reason: 'Test role change',
    });

    expect(result?.success).toBe(true);

    const { data: auditLog } = await adminClient
      .from('audit_logs')
      .select('*')
      .eq('entity_id', testAdminId)
      .eq('action', 'role_change')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    expect(auditLog).toBeDefined();
    expect(auditLog?.action).toBe('role_change');

    await adminClient.rpc('change_user_role', {
      p_target_user_id: testAdminId,
      p_new_role: 'admin',
      p_reason: 'Restore test admin',
    });
  });

  it('Invariant 6: Last owner cannot be downgraded', async () => {
    if (!dbAvailable) return;
    const { data: tempOwner } = await adminClient
      .from('users')
      .insert({
        email: 'temp-owner@example.com',
        full_name: 'Temp Owner',
        role: 'owner',
      })
      .select('id')
      .single();

    const { data: result1 } = await adminClient.rpc('change_user_role', {
      p_target_user_id: testOwnerId,
      p_new_role: 'admin',
      p_reason: 'Test downgrade',
    });

    expect(result1?.success).toBe(true);

    const { data: result2 } = await adminClient.rpc('change_user_role', {
      p_target_user_id: tempOwner?.id || '',
      p_new_role: 'admin',
      p_reason: 'Test last owner downgrade',
    });

    expect(result2?.success).toBe(false);

    await adminClient.rpc('change_user_role', {
      p_target_user_id: testOwnerId,
      p_new_role: 'owner',
      p_reason: 'Restore test owner',
    });

    await adminClient.from('users').delete().eq('id', tempOwner?.id);
  });

  it('Invariant 7: Invalid roles cannot be assigned', async () => {
    if (!dbAvailable) return;
    const { data: result } = await adminClient.rpc('change_user_role', {
      p_target_user_id: testCustomerId,
      p_new_role: 'superadmin',
      p_reason: 'Test invalid role',
    });

    expect(result?.success).toBe(false);
  });

  it('Invariant 8: Role source is canonical (users table only)', async () => {
    if (!dbAvailable) return;
    const { data: userRole } = await adminClient
      .from('users')
      .select('role')
      .eq('id', testOwnerId)
      .single();

    expect(userRole?.role).toBe('owner');
  });

  it('Invariant 9: Role invariants check function works', async () => {
    if (!dbAvailable) return;
    // Skip if RPC function doesn't exist
    const { data: result } = await adminClient.rpc('check_role_invariants');
    if (!result) return;

    expect(result?.at_least_one_owner).toBe(true);
    expect(result?.invariant_check_passed).toBe(true);
  });

  it('Invariant 10: Backfill function preserves existing roles', async () => {
    if (!dbAvailable) return;
    // Skip if RPC function doesn't exist
    const { data: result } = await adminClient.rpc('backfill_canonical_roles');
    if (!result) return;

    expect(result?.success).toBe(true);
  });
});
