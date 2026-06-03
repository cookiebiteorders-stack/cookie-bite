"use client";

import { MessageCircle } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { siteConfig } from "@/lib/site-config";

export function WhatsAppFab() {
  const n = siteConfig.whatsappNumber || BRAND.whatsappE164;
  const href = `https://wa.me/${n}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="cb-pl-whatsapp fixed bottom-20 start-5 z-40 flex h-12 w-12 items-center justify-center rounded-full text-white ring-2 ring-[#faf6ee]/90 transition hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-caramel)] md:bottom-6 md:start-6"
      aria-label={`WhatsApp — ${BRAND.phoneDisplay}`}
    >
      <MessageCircle className="h-7 w-7" strokeWidth={1.75} aria-hidden />
    </a>
  );
}
