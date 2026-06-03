"use client";

import Image from "next/image";
import Link from "next/link";
import type { SharedGiftBoxRow } from "@/lib/gift-box/share";
import { BRAND } from "@/lib/brand";
import { buttonClassName } from "@/components/ui/button";

type ProductSnap = {
  name?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  price_egp?: number | null;
  image_url?: string | null;
};

type ShareItem = {
  product_id: string;
  quantity: number;
  product_snapshot?: ProductSnap | null;
};

type Props = {
  box: SharedGiftBoxRow;
  lang?: "en" | "ar";
};

function itemName(snap: ProductSnap | null | undefined, ar: boolean): string {
  if (!snap) return ar ? "منتج" : "Product";
  return (ar ? snap.title_ar : snap.title_en) ?? snap.name ?? (ar ? "منتج" : "Product");
}

export function GiftPreviewClient({ box, lang = "en" }: Props) {
  const ar = lang === "ar";
  const items = (box.items ?? []) as ShareItem[];

  return (
    <div className="min-h-[70vh] bg-cb-cream px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl bg-cb-surface p-8 shadow-sm ring-1 ring-cb-border">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cb-peach text-4xl">
            🎁
          </div>
          <h1 className="mt-6 font-serif text-2xl font-semibold text-cb-text-strong">
            {ar ? "معاينة صندوق الهدايا" : "Gift box preview"}
          </h1>
          <p className="mt-2 text-sm text-cb-text-muted">
            {ar ? `حجم الصندوق: ${box.box_size}` : `Box size: ${box.box_size}`}
          </p>
        </div>

        {box.gift_message ? (
          <blockquote className="mt-6 rounded-2xl border border-cb-border bg-cb-cream px-4 py-3 text-sm italic text-cb-text">
            &ldquo;{box.gift_message}&rdquo;
          </blockquote>
        ) : null}

        <ul className="mt-6 space-y-3">
          {items.map((row) => {
            const snap = row.product_snapshot;
            const img = snap?.image_url ?? "/brand/gift-box/box-closed-ref.png";
            const unit = Number(snap?.price_egp ?? 0);
            return (
              <li
                key={row.product_id}
                className="flex items-center gap-3 rounded-2xl bg-cb-cream px-3 py-2"
              >
                <Image
                  src={img}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cb-text-strong">
                    {itemName(snap, ar)}
                  </p>
                  <p className="text-xs text-cb-text-muted">×{row.quantity}</p>
                </div>
                {unit > 0 ? (
                  <span className="text-sm font-semibold text-cb-terracotta-dark">
                    {Math.round(unit * row.quantity)} {BRAND.currency}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-center text-sm text-cb-text-muted">
          {ar ? "الإجمالي التقريبي" : "Estimated total"}:{" "}
          <strong className="text-cb-terracotta-dark">
            {Math.round(Number(box.total_price))} {BRAND.currency}
          </strong>
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/gift-box/build" className={buttonClassName("primary")}>
            {ar ? "صمّم صندوقك" : "Build your own box"}
          </Link>
          <Link href="/shop" className={buttonClassName("outline")}>
            {ar ? "تسوّق الكوكيز" : "Shop cookies"}
          </Link>
        </div>
      </div>
    </div>
  );
}
