"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type TestimonialItem = {
  id: string;
  rating: number;
  comment: string;
  status?: string | null;
  created_at?: string | null;
};

type Props = {
  initialItems: TestimonialItem[];
  enabled?: boolean;
};

function statusLabel(status?: string | null) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Not published";
  return "Pending review";
}

export function AccountTestimonialForm({ initialItems, enabled = true }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [items, setItems] = useState<TestimonialItem[]>(initialItems);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => enabled && comment.trim().length >= 10,
    [comment, enabled],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/account/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data && data.error?.en) ||
          "Could not submit testimonial right now. Please try again.";
        setError(msg);
        return;
      }
      if (data?.item) {
        setItems((prev) => [data.item as TestimonialItem, ...prev]);
      }
      setComment("");
      setRating(5);
      setMessage("Thanks! Your comment was sent for review.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      id="feedback"
      className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
    >
      <div className="mb-4">
        <h2 className="font-semibold text-cb-text-strong">
          Comments & testimonial
        </h2>
        <p className="mt-1 text-xs text-cb-text-muted">
          Share your experience. New submissions are reviewed before publishing.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setRating(v)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                rating >= v
                  ? "border-cb-terracotta-dark bg-cb-peach text-cb-terracotta-dark"
                  : "border-cb-border bg-cb-surface text-cb-text-muted hover:bg-cb-cream",
              )}
              aria-label={`Rate ${v}`}
            >
              {v}★
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          minLength={10}
          maxLength={600}
          placeholder="Write your comment..."
          className="w-full rounded-2xl border border-cb-border bg-cb-surface px-4 py-3 text-sm text-cb-text-strong outline-none transition focus:border-cb-border-strong focus:ring-2 focus:ring-cb-focus/30"
          disabled={!enabled}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-cb-text-muted">
            {comment.trim().length}/600 characters
          </p>
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="rounded-full bg-cb-terracotta-dark px-5 py-2 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>

      {!enabled ? (
        <p className="mt-3 text-sm text-cb-text-muted">
          Comments are temporarily unavailable until the database is connected.
        </p>
      ) : null}

      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold text-cb-text-strong">
          Your previous comments
        </h3>
        {items.length ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-cb-border bg-cb-surface p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-cb-terracotta-dark">
                    {"★".repeat(Math.max(1, Math.min(5, Number(item.rating) || 1)))}
                  </p>
                  <span className="rounded-full bg-cb-cream px-2 py-0.5 text-[10px] font-semibold text-cb-text-muted ring-1 ring-cb-border/50">
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-cb-text">{item.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-cb-text-muted">
            No comments yet. Add your first testimonial above.
          </p>
        )}
      </div>
    </section>
  );
}
