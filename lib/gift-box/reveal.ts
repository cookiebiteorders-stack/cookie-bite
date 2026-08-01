import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseGiftBoxSnapshot, type GiftBoxOrderSnapshot } from "@/lib/gift-box/order-snapshot";

export type GiftRevealPublic = {
  id: string;
  reveal_token: string;
  gift_message: string | null;
  sender_name: string | null;
  anonymous_sender: boolean;
  recipient_name: string | null;
  gift_box_snapshot: GiftBoxOrderSnapshot | null;
  reveal_viewed_at: string | null;
  reveal_reaction: string | null;
  reveal_expires_at: string | null;
};

export { giftRevealPath, giftRevealUrl } from "@/lib/gift-box/public-urls";

export async function getOrderByRevealToken(
  token: string,
): Promise<GiftRevealPublic | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, reveal_token, gift_message, sender_name, anonymous_sender, recipient_name, gift_box_snapshot, reveal_viewed_at, reveal_reaction, reveal_expires_at, payment_status",
    )
    .eq("reveal_token", token)
    .maybeSingle();

  if (error || !data) return null;
  if (data.payment_status !== "paid") return null;
  const snapshot = parseGiftBoxSnapshot(data.gift_box_snapshot);
  if (!snapshot) return null;

  return {
    id: data.id as string,
    reveal_token: String(data.reveal_token),
    gift_message: (data.gift_message as string | null) ?? null,
    sender_name: (data.sender_name as string | null) ?? null,
    anonymous_sender: Boolean(data.anonymous_sender),
    recipient_name: (data.recipient_name as string | null) ?? null,
    gift_box_snapshot: snapshot,
    reveal_viewed_at: (data.reveal_viewed_at as string | null) ?? null,
    reveal_reaction: (data.reveal_reaction as string | null) ?? null,
    reveal_expires_at: (data.reveal_expires_at as string | null) ?? null,
  };
}

export async function markRevealViewed(orderId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await supabase
    .from("orders")
    .update({ reveal_viewed_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("reveal_viewed_at", null);
}

const REACTIONS = new Set(["love", "wow", "yum", "thanks"]);

export async function saveRevealReaction(
  token: string,
  reaction: string,
): Promise<boolean> {
  if (!REACTIONS.has(reaction)) return false;
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("orders")
    .update({ reveal_reaction: reaction })
    .eq("reveal_token", token);
  return !error;
}
