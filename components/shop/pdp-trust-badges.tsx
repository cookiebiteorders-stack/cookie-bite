"use client";

import { Check, Shield, Heart, Star } from "lucide-react";

const TRUST_BADGES = [
  {
    icon: Check,
    label: "Freshly Baked",
    description: "Made fresh for every order",
  },
  {
    icon: Star,
    label: "Belgian Chocolate",
    description: "Premium quality ingredients",
  },
  {
    icon: Shield,
    label: "Secure Payments",
    description: "Protected transactions",
  },
  {
    icon: Heart,
    label: "Made With Care",
    description: "Handcrafted with love",
  },
];

export function PdpTrustBadges() {
  return (
    <section className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {TRUST_BADGES.map((badge) => (
        <div
          key={badge.label}
          className="flex flex-col items-center rounded-xl border border-cb-border bg-cb-surface p-4 text-center"
        >
          <badge.icon className="h-6 w-6 text-cb-terracotta-dark" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-cb-text-strong">
            {badge.label}
          </p>
          <p className="mt-1 text-xs text-cb-text-muted">{badge.description}</p>
        </div>
      ))}
    </section>
  );
}
