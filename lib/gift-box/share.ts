import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { giftPreviewUrl } from "@/lib/gift-box/public-urls";

export type GiftBoxShareItem = {
  product_id: string;
  quantity: number;
  product_snapshot?: Record<string, unknown> | null;
};

export type CreateGiftBoxShareInput = {
  box_size: string;
  items: GiftBoxShareItem[];
  gift_message?: string | null;
  ribbon_color?: string;
  has_wrapping?: boolean;
  total_price: number;
};

export type SharedGiftBoxRow = {
  id: string;
  share_token: string;
  box_size: string;
  items: GiftBoxShareItem[];
  gift_message: string | null;
  ribbon_color: string;
  has_wrapping: boolean;
  total_price: number;
  view_count: number;
  created_at: string;
};

export { giftPreviewPath, giftPreviewUrl } from "@/lib/gift-box/public-urls";

export async function createGiftBoxShare(
  input: CreateGiftBoxShareInput,
): Promise<{ share_token: string; share_url: string; id: string } | null> {
  const supabase = createSupabaseAdminClient();
  const profile = await getCurrentProfile();

  const { data, error } = await supabase
    .from("gift_boxes")
    .insert({
      user_id: profile?.id ?? null,
      box_size: input.box_size,
      items: input.items,
      gift_message: input.gift_message ?? null,
      ribbon_color: input.ribbon_color ?? "gold",
      has_wrapping: input.has_wrapping ?? true,
      total_price: input.total_price,
      is_active: true,
    })
    .select("id, share_token")
    .single();

  if (error || !data) {
    console.error("createGiftBoxShare", error);
    return null;
  }

  const token = String(data.share_token);
  return {
    id: data.id as string,
    share_token: token,
    share_url: giftPreviewUrl(token),
  };
}

export async function getGiftBoxByShareToken(
  token: string,
): Promise<SharedGiftBoxRow | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gift_boxes")
    .select(
      "id, share_token, box_size, items, gift_message, ribbon_color, has_wrapping, total_price, view_count, created_at",
    )
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  await supabase
    .from("gift_boxes")
    .update({ view_count: Number(data.view_count ?? 0) + 1 })
    .eq("id", data.id);

  return data as SharedGiftBoxRow;
}
