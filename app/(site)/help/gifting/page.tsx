import { HelpArticleLayout } from "@/components/pages/help-article-layout";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { HELP_GIFTING } from "@/lib/content/help-articles";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: HELP_GIFTING.title,
  description: HELP_GIFTING.description,
  path: HELP_GIFTING.path,
  keywords: HELP_GIFTING.keywords,
});

export default function HelpGiftingPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
    { name: HELP_GIFTING.title, path: HELP_GIFTING.path },
  ]);

  return (
    <>
      <JsonLdScript id="help-gifting-breadcrumb" json={breadcrumbJsonLd} />
      <HelpArticleLayout article={HELP_GIFTING} />
    </>
  );
}
