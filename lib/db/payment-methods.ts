import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentMethodUpsertInput } from "@/lib/account/payment-method-schema";
import { normalizePaymentMethodPayload } from "@/lib/account/payment-method-schema";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type SavedPaymentMethodRow = {
  id: string;
  user_id: string;
  method_type: "card" | "wallet" | "instapay" | "fawry" | "cod";
  label: string;
  wallet_provider: string | null;
  account_hint: string | null;
  card_last4: string | null;
  cardholder_name: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export function buildPaymentMethodRow(
  userId: string,
  input: PaymentMethodUpsertInput,
  options?: { isDefault?: boolean },
): Record<string, string | boolean | null> {
  const normalized = normalizePaymentMethodPayload(input);
  return {
    user_id: userId,
    method_type: normalized.method_type,
    label: normalized.label,
    wallet_provider: normalized.wallet_provider,
    account_hint: normalized.account_hint,
    card_last4: normalized.card_last4,
    cardholder_name: normalized.cardholder_name,
    is_default: options?.isDefault ?? false,
    updated_at: new Date().toISOString(),
  };
}

export async function listPaymentMethodsForUser(
  userId: string,
): Promise<SavedPaymentMethodRow[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listPaymentMethodsForUser error", error);
    return [];
  }
  return (data as SavedPaymentMethodRow[]) ?? [];
}

export async function countPaymentMethodsForUser(userId: string): Promise<number> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("saved_payment_methods")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("countPaymentMethodsForUser error", error);
    return 0;
  }
  return count ?? 0;
}

export async function getPaymentMethodOwnedByUser(
  userId: string,
  methodId: string,
): Promise<SavedPaymentMethodRow | null> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("saved_payment_methods")
    .select("*")
    .eq("id", methodId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("getPaymentMethodOwnedByUser error", error);
    return null;
  }
  return (data as SavedPaymentMethodRow | null) ?? null;
}

export async function clearDefaultPaymentMethodsForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  await supabase
    .from("saved_payment_methods")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}
