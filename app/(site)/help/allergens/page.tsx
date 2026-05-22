import { HelpArticleLayout } from "@/components/pages/help-article-layout";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { HELP_ALLERGENS } from "@/lib/content/help-articles";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: HELP_ALLERGENS.title,
  description: HELP_ALLERGENS.description,
  path: HELP_ALLERGENS.path,
  keywords: HELP_ALLERGENS.keywords,
});

export default function HelpAllergensPage() {
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
    { name: HELP_ALLERGENS.title, path: HELP_ALLERGENS.path },
  ]);

  return (
    <>
      <JsonLdScript id="help-allergens-breadcrumb" json={breadcrumbJsonLd} />
      <HelpArticleLayout article={HELP_ALLERGENS} />
    </>
  );
}
