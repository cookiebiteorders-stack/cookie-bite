import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecoverCartClient } from "@/components/cart/recover-cart-client";
import { getAbandonedCartByToken, type AbandonedCartSnapshot } from "@/lib/cart/abandoned";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Recover your cart",
  description: "Restore your Cookie Bite cart and complete your order.",
  path: "/cart/recover",
  noIndex: true,
});

type Props = {
  params: Promise<{ token: string }>;
};

export default async function RecoverCartPage({ params }: Props) {
  const { token } = await params;
  const cart = await getAbandonedCartByToken(token);

  if (!cart || cart.is_recovered) {
    notFound();
  }

  const supabase = createSupabaseAdminClient();
  const { data: discountRow } = await supabase
    .from("recovery_discount_codes")
    .select("code, is_used, expires_at")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let discountCode: string | null = null;
  if (
    discountRow &&
    !discountRow.is_used &&
    new Date(String(discountRow.expires_at)) > new Date()
  ) {
    discountCode = String(discountRow.code);
  }

  return (
    <RecoverCartClient
      token={token}
      cartSnapshot={cart.cart_snapshot as AbandonedCartSnapshot}
      discountCode={discountCode}
    />
  );
}
