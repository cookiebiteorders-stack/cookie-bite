import { ShippingDeliveryPageBody } from "@/components/pages/shipping-delivery-page-body";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { translations } from "@/lib/i18n/translations";
import { buildBreadcrumbJsonLd, buildLocalizedPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

export async function generateMetadata() {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/shipping", lang);
}

export default async function ShippingDeliveryPage() {
  const lang = await getLangFromCookies();
  const dict = translations[lang];
  const pages = dict.pages as {
    shippingDelivery: { title: string };
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: (dict.tabs as { home: string }).home, path: "/" },
    { name: pages.shippingDelivery.title, path: "/shipping" },
  ]);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="shipping-delivery-breadcrumb" json={breadcrumbJsonLd} />
      <ShippingDeliveryPageBody />
    </div>
  );
}
