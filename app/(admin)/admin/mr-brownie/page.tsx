import { MrBrownieAnalyticsDashboard } from "@/components/admin/mr-brownie/mr-brownie-analytics-dashboard";

export const metadata = {
  title: "Mr. Brownie AI · Analytics",
  description: "Response quality, intents, and training loop for the storefront assistant.",
};

export default function AdminMrBrowniePage() {
  return <MrBrownieAnalyticsDashboard />;
}
