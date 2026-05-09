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
      className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg ring-2 ring-white/90 transition hover:scale-105 hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-focus md:bottom-6 md:end-6"
      aria-label={`WhatsApp — ${BRAND.phoneDisplay}`}
    >
      <MessageCircle className="h-7 w-7" strokeWidth={1.75} aria-hidden />
    </a>
  );
}
