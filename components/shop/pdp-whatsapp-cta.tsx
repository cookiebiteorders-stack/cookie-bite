"use client";

import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { BRAND } from "@/lib/brand";
import { siteConfig } from "@/lib/site-config";
import { trackGa4Event } from "@/lib/analytics/ga4";

type Props = {
  productName: string;
  productSlug: string;
};

function whatsappDigits(): string {
  const raw = siteConfig.whatsappNumber?.trim() || BRAND.whatsappE164;
  return raw.replace(/\D/g, "");
}

export function PdpWhatsAppCta({ productName, productSlug }: Props) {
  const { t } = useLanguage();
  const digits = whatsappDigits();
  if (!digits) return null;

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://cookie-bite.com";
  const productUrl = `${base}/shop/${encodeURIComponent(productSlug)}`;
  const text = t("product.whatsappPrefill", { name: productName, url: productUrl });
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackGa4Event("whatsapp_click", {
          source: "pdp",
          product_slug: productSlug,
        })
      }
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-5 py-3 text-sm font-bold text-[#128C7E] transition hover:bg-[#25D366]/20 sm:w-auto"
    >
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
      {t("product.whatsappCta")}
    </a>
  );
}
