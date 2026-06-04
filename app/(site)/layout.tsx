import { PageShell } from "@/components/layout/page-shell";
import { getServerT } from "@/lib/i18n/server-translate";
import { getLangFromCookies } from "@/lib/seo/server";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLangFromCookies();
  const skipToMainLabel = getServerT(lang)("actions.skipToMain");

  return <PageShell skipToMainLabel={skipToMainLabel}>{children}</PageShell>;
}
