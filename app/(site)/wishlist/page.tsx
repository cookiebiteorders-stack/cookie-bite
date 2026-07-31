"use client";

import { Heart, ShoppingBag, Gift } from "lucide-react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export default function WishlistPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="rounded-3xl border border-cb-border bg-cb-surface p-12 text-center">
          <div className="mb-6 inline-flex rounded-full bg-cb-peach/30 p-4">
            <Heart className="h-12 w-12 text-cb-terracotta-dark" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-cb-text-strong">
            {t("wishlist.emptyTitle") || "Your wishlist is empty"}
          </h1>
          <p className="mt-3 text-cb-text-muted">
            {t("wishlist.emptyDescription") || "Save your favorite cookies and gift boxes here."}
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/shop"
              className={buttonClassName("primary", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
            >
              <ShoppingBag className="h-4 w-4" />
              Shop Cookies
            </Link>
            <Link
              href="/gift-box"
              className={buttonClassName("outline", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
            >
              <Gift className="h-4 w-4" />
              Shop Gift Boxes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
