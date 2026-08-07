import { getCsrfTokenForClient } from "@/lib/security/csrf";
import CheckoutPageClient from "./checkout-page-client";

export default async function CheckoutPage() {
  const csrfData = await getCsrfTokenForClient();
  return <CheckoutPageClient csrfToken={csrfData.token} />;
}
