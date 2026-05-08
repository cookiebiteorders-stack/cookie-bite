import { PageShell } from "@/components/layout/page-shell";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageShell>{children}</PageShell>;
}
