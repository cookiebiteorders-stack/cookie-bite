"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, ThumbsUp } from "lucide-react";
import type { PdpReview } from "@/lib/storefront/pdp-api";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type Props = {
  reviews: PdpReview[];
  reviewCount: number;
  avgRating: number | null;
};

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const icon = size === "md" ? "h-5 w-5" : "h-4 w-4";
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            icon,
            n <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-cb-border",
          )}
        />
      ))}
    </span>
  );
}

function ReviewHelpfulButton({
  reviewId,
  initialCount,
}: {
  reviewId: string;
  initialCount: number;
}) {
  const { t } = useLanguage();
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  const vote = async () => {
    if (busy || voted) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, { method: "POST" });
      const data = (await res.json()) as {
        helpful_count?: number;
        already_voted?: boolean;
      };
      if (res.ok && typeof data.helpful_count === "number") {
        setCount(data.helpful_count);
        setVoted(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy || voted}
      onClick={() => void vote()}
      className={cn(
        "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition",
        voted
          ? "border-cb-terracotta-dark/40 bg-cb-peach text-cb-terracotta-dark"
          : "border-cb-border bg-cb-surface text-cb-text-strong hover:bg-cb-peach",
      )}
    >
      <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
      {t("product.reviewsHelpful")}
      {count > 0 ? (
        <span className="text-cb-text-muted">({count})</span>
      ) : null}
    </button>
  );
}

export function PdpReviewsSection({ reviews, reviewCount, avgRating }: Props) {
  const { t, lang } = useLanguage();

  if (reviewCount === 0 && reviews.length === 0) return null;

  const formatter = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <section className="mt-16" aria-labelledby="pdp-reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="pdp-reviews-heading"
            className="font-serif text-2xl font-semibold text-cb-text-strong"
          >
            {t("product.reviewsTitle")}
          </h2>
          {avgRating != null && reviewCount > 0 ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-cb-text">
              <Stars rating={avgRating} size="md" />
              <span className="font-bold text-cb-text-strong">
                {avgRating.toFixed(1)}
              </span>
              <span>
                {t("product.reviewsCount", { count: reviewCount })}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="mt-6 text-sm text-cb-text-muted">{t("product.reviewsEmpty")}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl border border-cb-border bg-cb-surface p-4 sm:p-5",
                r.isFeatured && "ring-2 ring-cb-terracotta-dark/25",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={r.rating} />
                <time
                  dateTime={r.createdAt}
                  className="text-xs font-medium text-cb-text-muted"
                >
                  {formatter.format(new Date(r.createdAt))}
                </time>
              </div>
              {r.photoUrl ? (
                <div className="relative mt-3 aspect-[4/3] max-w-sm overflow-hidden rounded-xl bg-cb-peach/30">
                  <Image
                    src={r.photoUrl}
                    alt=""
                    fill
                    sizes="(max-width:640px) 100vw, 320px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              {r.body?.trim() ? (
                <p className="mt-3 text-sm leading-relaxed text-cb-text">{r.body}</p>
              ) : null}
              {r.isFeatured ? (
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-cb-terracotta-dark">
                  {t("product.reviewsFeatured")}
                </p>
              ) : null}
              <ReviewHelpfulButton reviewId={r.id} initialCount={r.helpfulCount} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
