import { ResponsiveShell } from "@/components/layout/responsive/responsive-shell";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ResponsiveShell>{children}</ResponsiveShell>;
}
