import { HelpArticleLayout } from "@/components/pages/help-article-layout";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { HELP_PAYMENTS } from "@/lib/content/help-articles";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: HELP_PAYMENTS.title,
  description: HELP_PAYMENTS.description,
  path: HELP_PAYMENTS.path,
  keywords: HELP_PAYMENTS.keywords,
});

export default function HelpPaymentsPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
    { name: HELP_PAYMENTS.title, path: HELP_PAYMENTS.path },
  ]);

  return (
    <>
      <JsonLdScript id="help-payments-breadcrumb" json={breadcrumbJsonLd} />
      <HelpArticleLayout article={HELP_PAYMENTS} />
    </>
  );
}
