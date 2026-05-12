import { PageShell } from "@/components/layout/page-shell";
import { SiteAmbientAudio } from "@/components/layout/site-ambient-audio";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageShell>
      <SiteAmbientAudio />
      {children}
    </PageShell>
  );
}
