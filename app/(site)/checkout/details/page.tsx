import { redirect } from "next/navigation";

/**
 * Old checkout details page - redirect to new unified checkout page
 */
export default function CheckoutDetailsPage() {
  redirect("/checkout");
}
