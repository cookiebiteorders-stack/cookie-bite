"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BadgeCheck, Star, ThumbsUp, MessageSquare } from "lucide-react";
import type { PdpReview } from "@/lib/storefront/pdp-api";
import type { RatingDistribution } from "@/lib/storefront/review-stats";
import { totalFromDistribution } from "@/lib/storefront/review-stats";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReviewFilter = "all" | "photos" | "verified" | "helpful";

type Props = {
  reviews: PdpReview[];
  reviewCount: number;
  avgRating: number | null;
  ratingDistribution: RatingDistribution;
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

function RatingHistogram({
  distribution,
  total,
}: {
  distribution: RatingDistribution;
  total: number;
}) {
  const { t } = useLanguage();
  if (total <= 0) return null;

  return (
    <div
      className="mt-4 w-full max-w-xs space-y-1.5"
      aria-label={t("product.reviewsHistogramAria")}
    >
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const count = distribution[star];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs font-medium text-cb-text">
            <span className="w-3 tabular-nums text-cb-text-strong">{star}</span>
            <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-cb-peach/50">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-end tabular-nums text-cb-text-muted">{count}</span>
          </div>
        );
      })}
    </div>
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

function applyReviewFilter(reviews: PdpReview[], filter: ReviewFilter): PdpReview[] {
  if (filter === "photos") {
    return reviews.filter((r) => Boolean(r.photoUrl?.trim()));
  }
  if (filter === "verified") {
    return reviews.filter((r) => r.isVerifiedPurchase);
  }
  if (filter === "helpful") {
    return [...reviews]
      .filter((r) => r.helpfulCount > 0)
      .sort((a, b) => b.helpfulCount - a.helpfulCount);
  }
  return reviews;
}

export function PdpReviewsSection({
  reviews,
  reviewCount,
  avgRating,
  ratingDistribution,
}: Props) {
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState<ReviewFilter>("all");

  const histogramTotal = totalFromDistribution(ratingDistribution);

  const filteredReviews = useMemo(
    () => applyReviewFilter(reviews, filter),
    [reviews, filter],
  );

  // Empty state - show CTA instead of hiding section
  if (reviewCount === 0 && reviews.length === 0) {
    return (
      <section className="mt-16" aria-labelledby="pdp-reviews-heading">
        <h2
          id="pdp-reviews-heading"
          className="font-serif text-2xl font-semibold text-cb-text-strong"
        >
          {t("product.reviewsTitle")}
        </h2>
        <div className="mt-6 rounded-2xl border border-cb-border bg-cb-surface p-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-cb-peach/30 p-4">
            <MessageSquare className="h-8 w-8 text-cb-terracotta-dark" aria-hidden />
          </div>
          <h3 className="font-serif text-xl font-semibold text-cb-text-strong">
            {t("product.reviewsEmptyTitle")}
          </h3>
          <p className="mt-2 text-cb-text-muted">
            {t("product.reviewsEmptyDescription")}
          </p>
          <button
            type="button"
            className={buttonClassName("primary", "mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3")}
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
            {t("product.reviewsWriteFirst")}
          </button>
        </div>
      </section>
    );
  }

  const formatter = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const filterOptions: Array<{ id: ReviewFilter; label: string }> = [
    { id: "all", label: t("product.reviewsFilterAll") },
    { id: "photos", label: t("product.reviewsFilterPhotos") },
    { id: "verified", label: t("product.reviewsFilterVerified") },
    { id: "helpful", label: t("product.reviewsFilterHelpful") },
  ];

  return (
    <section className="mt-16" aria-labelledby="pdp-reviews-heading">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
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
          <RatingHistogram distribution={ratingDistribution} total={histogramTotal || reviewCount} />
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label={t("product.reviewsFilterAria")}
        >
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={filter === opt.id}
              onClick={() => setFilter(opt.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ring-1 transition",
                filter === opt.id
                  ? "bg-cb-brand-600 text-white ring-cb-brand-600"
                  : "bg-cb-surface text-cb-text-strong ring-cb-border hover:bg-cb-peach",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filteredReviews.length === 0 ? (
        <p className="mt-6 text-sm text-cb-text-muted">{t("product.reviewsFilterEmpty")}</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {filteredReviews.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl border border-cb-border bg-cb-surface p-4 sm:p-5",
                r.isFeatured && "ring-2 ring-cb-terracotta-dark/25",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars rating={r.rating} />
                  {r.isVerifiedPurchase ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
                      <BadgeCheck className="h-3 w-3" aria-hidden />
                      {t("product.reviewsVerifiedBadge")}
                    </span>
                  ) : null}
                </div>
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
