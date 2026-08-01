"use client";

import { Check } from "lucide-react";

const PREMIUM_FEATURES = [
  "Freshly baked for every order",
  "Premium Belgian chocolate",
  "Handcrafted with care",
  "Same-day delivery available",
  "Multiple payment methods",
  "Made with premium ingredients",
];

export function PdpPremiumFeatures() {
  return (
    <section className="mt-6 rounded-2xl border border-cb-border/70 bg-cb-surface/60 px-5 py-4">
      <ul className="space-y-2">
        {PREMIUM_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span className="text-sm text-cb-text-strong">{feature}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
