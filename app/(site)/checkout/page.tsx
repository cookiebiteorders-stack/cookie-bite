import CheckoutPageClient from "./checkout-page-client";

export default function CheckoutPage() {
  // Don't generate CSRF token server-side to avoid SSR issues
  // Client will fetch it from /api/csrf
  return <CheckoutPageClient />;
}
