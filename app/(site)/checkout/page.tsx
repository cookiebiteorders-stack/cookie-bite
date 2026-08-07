import { getCsrfToken } from "@/lib/security/csrf";
import CheckoutPageClient from "./checkout-page-client";

export default async function CheckoutPage() {
  const csrfToken = await getCsrfToken();
  return <CheckoutPageClient csrfToken={csrfToken} />;
}
