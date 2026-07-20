import { redirect } from "next/navigation";

/**
 * The multi-step checkout flow (Shipping → Payment → Review) has been removed.
 * Checkout is now handled directly from the Cart page via Paymob hosted checkout.
 * Any direct navigation to /checkout is redirected to /cart.
 */
export default function CheckoutPage() {
  redirect("/cart");
}
