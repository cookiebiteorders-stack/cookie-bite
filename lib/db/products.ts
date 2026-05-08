import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductRow } from "@/lib/db/types";

export async function listActiveProducts(): Promise<ProductRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listActiveProducts error", error);
    return [];
  }
  return (data as ProductRow[]) ?? [];
}

export async function listAllProducts(): Promise<ProductRow[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("listAllProducts error", error);
    return [];
  }
  return (data as ProductRow[]) ?? [];
}

export async function getProductBySlug(slug: string): Promise<ProductRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("getProductBySlug error", error);
    return null;
  }
  return (data as ProductRow) ?? null;
}
