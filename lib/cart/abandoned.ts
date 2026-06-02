import type { CartLine } from "@/lib/cart/types";
import { cartSubtotal } from "@/lib/cart/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AbandonedCartSnapshot = {
  version: 1;
  lines: CartLine[];
  subtotalEgp: number;
};

export type AbandonedCartRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  phone: string | null;
  cart_snapshot: AbandonedCartSnapshot;
  recovery_token: string;
  reminder_1_sent_at: string | null;
  reminder_2_sent_at: string | null;
  recovered_at: string | null;
  is_recovered: boolean;
  cart_value: number;
  created_at: string;
  updated_at: string;
};

export function buildAbandonedCartSnapshot(lines: CartLine[]): AbandonedCartSnapshot | null {
  if (lines.length === 0) return null;
  return {
    version: 1,
    lines,
    subtotalEgp: cartSubtotal(lines),
  };
}

export function cartValueFromSnapshot(snapshot: AbandonedCartSnapshot): number {
  return Number(snapshot.subtotalEgp ?? cartSubtotal(snapshot.lines ?? []));
}

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed && trimmed.includes("@") ? trimmed : null;
}

export async function upsertAbandonedCart(input: {
  userId?: string | null;
  email?: string | null;
  phone?: string | null;
  snapshot: AbandonedCartSnapshot;
}): Promise<{ id: string; recoveryToken: string } | null> {
  const supabase = createSupabaseAdminClient();
  const email = normalizeEmail(input.email);
  const cartValue = cartValueFromSnapshot(input.snapshot);
  const now = new Date().toISOString();

  let existingId: string | null = null;

  if (input.userId) {
    const { data } = await supabase
      .from("abandoned_carts")
      .select("id")
      .eq("user_id", input.userId)
      .eq("is_recovered", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (!existingId && email) {
    const { data } = await supabase
      .from("abandoned_carts")
      .select("id")
      .eq("email", email)
      .eq("is_recovered", false)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    existingId = data?.id ?? null;
  }

  if (existingId) {
    const { data, error } = await supabase
      .from("abandoned_carts")
      .update({
        cart_snapshot: input.snapshot,
        cart_value: cartValue,
        email: email ?? undefined,
        phone: input.phone?.trim() || null,
        user_id: input.userId ?? undefined,
        updated_at: now,
      })
      .eq("id", existingId)
      .select("id, recovery_token")
      .single();
    if (error || !data) {
      console.error("upsertAbandonedCart update error", error);
      return null;
    }
    return { id: data.id as string, recoveryToken: data.recovery_token as string };
  }

  const { data, error } = await supabase
    .from("abandoned_carts")
    .insert({
      user_id: input.userId ?? null,
      email,
      phone: input.phone?.trim() || null,
      cart_snapshot: input.snapshot,
      cart_value: cartValue,
    })
    .select("id, recovery_token")
    .single();

  if (error || !data) {
    console.error("upsertAbandonedCart insert error", error);
    return null;
  }

  return { id: data.id as string, recoveryToken: data.recovery_token as string };
}

export async function getAbandonedCartByToken(token: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("abandoned_carts")
    .select("*")
    .eq("recovery_token", token)
    .maybeSingle();

  if (error || !data) return null;
  return data as AbandonedCartRow;
}

export async function markAbandonedCartRecovered(input: {
  token?: string;
  userId?: string | null;
  email?: string | null;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const patch = {
    is_recovered: true,
    recovered_at: now,
    updated_at: now,
  };

  if (input.token) {
    await supabase.from("abandoned_carts").update(patch).eq("recovery_token", input.token);
    return;
  }

  const email = normalizeEmail(input.email);
  if (input.userId) {
    await supabase
      .from("abandoned_carts")
      .update(patch)
      .eq("user_id", input.userId)
      .eq("is_recovered", false);
  }
  if (email) {
    await supabase
      .from("abandoned_carts")
      .update(patch)
      .eq("email", email)
      .eq("is_recovered", false);
  }
}
