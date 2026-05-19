import { redirect } from "next/navigation";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "My Orders",
  description: "View your Cookie Bite order history, tracking, and invoices.",
  path: "/account/orders",
  noIndex: true,
});

/** Email links use /account/orders — send users to the orders section on the dashboard. */
export default function AccountOrdersPage() {
  redirect("/account#orders");
}
