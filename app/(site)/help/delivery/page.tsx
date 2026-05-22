import { HelpArticleLayout } from "@/components/pages/help-article-layout";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { HELP_DELIVERY } from "@/lib/content/help-articles";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: HELP_DELIVERY.title,
  description: HELP_DELIVERY.description,
  path: HELP_DELIVERY.path,
  keywords: HELP_DELIVERY.keywords,
});

export default function HelpDeliveryPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
    { name: HELP_DELIVERY.title, path: HELP_DELIVERY.path },
  ]);

  return (
    <>
      <JsonLdScript id="help-delivery-breadcrumb" json={breadcrumbJsonLd} />
      <HelpArticleLayout article={HELP_DELIVERY} />
    </>
  );
}
