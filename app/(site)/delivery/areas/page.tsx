import Link from "next/link";
import { SectionHeading } from "@/components/sections/section-heading";
import { buttonClassName } from "@/components/ui/button";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { BRAND } from "@/lib/brand";
import { DELIVERY_AREAS_FAQ } from "@/lib/content/local-pages";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildLocalizedPageMetadata,
} from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { getPublicShippingZones } from "@/lib/shipping/public-zones-server";
import {
  resolveZoneDisplayLabels,
  type PublicShippingZone,
} from "@/lib/shipping/public-zones-shared";
import { translations, type Lang } from "@/lib/i18n/translations";

export async function generateMetadata() {
  const lang = await getLangFromCookies();
  return buildLocalizedPageMetadata("/delivery/areas", lang);
}

function areasCopy(lang: Lang) {
  const pages = translations[lang].pages as {
    deliveryAreas?: {
      eyebrow: string;
      title: string;
      subtitle: string;
      intro: string;
      faqTitle: string;
      notListed: string;
      contactUs: string;
      cta: string;
    };
  };
  return (
    pages.deliveryAreas ?? {
      eyebrow: lang === "ar" ? "التوصيل" : "Delivery",
      title:
        lang === "ar"
          ? "مناطق التوصيل التي نخدمها بانتظام"
          : "Delivery areas we frequently serve",
      subtitle:
        lang === "ar"
          ? "كمبوندات وأحياء شائعة — تُحدَّث من لوحة الشحن في الإدارة."
          : "Popular compounds and neighborhoods — synced from admin shipping zones.",
      intro:
        lang === "ar"
          ? `أرسل اسم الكمبوند على واتساب ${BRAND.phoneDisplay} قبل الطلبات الكبيرة. نؤكد التوقيت والرسوم لمنطقتك.`
          : `Send your compound name to WhatsApp ${BRAND.phoneDisplay} before large orders. We confirm timing and fees for your zone.`,
      faqTitle: lang === "ar" ? "أسئلة شائعة" : "FAQ",
      notListed: lang === "ar" ? "لا ترى منطقتك؟" : "Don't see your area?",
      contactUs: lang === "ar" ? "تواصل معنا" : "Contact us",
      cta: lang === "ar" ? "دليل التوصيل في القاهرة الجديدة" : "New Cairo delivery guide",
    }
  );
}

export default async function DeliveryAreasPage() {
  const lang = await getLangFromCookies();
  const zones = await getPublicShippingZones();
  const copy = areasCopy(lang);
  const areaLabels = resolveZoneDisplayLabels(zones, lang);

  const faqJsonLd = buildFaqPageJsonLd([...DELIVERY_AREAS_FAQ]);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: lang === "ar" ? "الرئيسية" : "Home", path: "/" },
    {
      name: lang === "ar" ? "مناطق التوصيل" : "Delivery areas",
      path: "/delivery/areas",
    },
  ]);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id="delivery-areas-faq" json={faqJsonLd} />
      <JsonLdScript id="delivery-areas-breadcrumb" json={breadcrumbJsonLd} />
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="start"
          eyebrow={copy.eyebrow}
          title={copy.title}
          subtitle={copy.subtitle}
        />

        <p className="mt-6 text-sm leading-relaxed text-cb-text">{copy.intro}</p>

        <DeliveryAreasGrid areas={areaLabels} zones={zones} lang={lang} />

        <section className="mt-12">
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{copy.faqTitle}</h2>
          <ul className="mt-6 space-y-4">
            {DELIVERY_AREAS_FAQ.map((item) => (
              <li key={item.q} className="rounded-2xl border border-cb-border bg-cb-surface p-5">
                <h3 className="font-semibold text-cb-text-strong">{item.q}</h3>
                <p className="mt-2 text-sm text-cb-text">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-center text-sm text-cb-text-muted">
          {copy.notListed}{" "}
          <Link href="/contact" className="font-bold text-cb-terracotta-dark underline">
            {copy.contactUs}
          </Link>
        </p>

        <Link
          href="/delivery/new-cairo"
          className={buttonClassName("primary", "mt-10 inline-flex rounded-full px-8")}
        >
          {copy.cta}
        </Link>
      </div>
    </div>
  );
}

function DeliveryAreasGrid({
  areas,
  zones,
  lang,
}: {
  areas: string[];
  zones: PublicShippingZone[];
  lang: Lang;
}) {
  if (zones.length > 0) {
    return (
      <div className="mt-8 space-y-6">
        {zones.map((zone) => {
          const items = zone.cities.length > 0 ? zone.cities : [zone.name];
          return (
            <section key={zone.id}>
              <h2 className="mb-3 font-serif text-lg font-semibold text-cb-text-strong">
                {zone.name}
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((area) => (
                  <li
                    key={`${zone.id}-${area}`}
                    className="rounded-xl border border-cb-border bg-cb-surface px-4 py-3 text-sm font-medium text-cb-text"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <ul className="mt-8 grid gap-2 sm:grid-cols-2">
      {areas.map((area) => (
        <li
          key={area}
          className="rounded-xl border border-cb-border bg-cb-surface px-4 py-3 text-sm font-medium text-cb-text"
        >
          {area}
        </li>
      ))}
    </ul>
  );
}
