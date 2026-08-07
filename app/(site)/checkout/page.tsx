import { getCsrfTokenForClient } from "@/lib/security/csrf";
import CheckoutPageClient from "./checkout-page-client";

export default async function CheckoutPage() {
  let csrfToken = "";
  try {
    const csrfData = await getCsrfTokenForClient();
    csrfToken = csrfData.token;
  } catch (error) {
    console.error("Failed to generate CSRF token:", error);
    // Fallback: generate a simple token if CSRF fails
    csrfToken = "fallback-" + Date.now().toString(36);
  }
  return <CheckoutPageClient csrfToken={csrfToken} />;
}
