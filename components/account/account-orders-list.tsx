"use client";

import Link from "next/link";
import { FileText, Search, Package } from "lucide-react";
import { ReorderGiftBoxButton } from "@/components/account/reorder-gift-box-button";
import { GiftRevealLinkButton } from "@/components/account/gift-reveal-link-button";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AccountOrderRow = {
  id: string;
  order_number: number;
  order_code?: string | null;
  total_egp: number;
  payment_status: string;
  status: string;
  order_type?: string | null;
  gift_box_snapshot?: unknown;
  reveal_token?: string | null;
  created_at?: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  processing: "bg-sky-100 text-sky-900",
  shipped: "bg-indigo-100 text-indigo-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-stone-200 text-stone-800",
  refunded: "bg-rose-100 text-rose-900",
};

type Props = {
  orders: AccountOrderRow[];
  /** Show order date on each row (full orders page). */
  showDate?: boolean;
  /** Slightly roomier layout for the dedicated orders page. */
  detailed?: boolean;
};

function formatOrderDate(iso: string, lang: string) {
  try {
    return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AccountOrdersList({ orders, showDate = false, detailed = false }: Props) {
  const { t, lang, formatPrice } = useLanguage();

  return (
    <>
      {orders.length ? (
        <ul className="space-y-3">
          {orders.map((o) => {
            const invoiceNumber = `INV-${String(o.order_number).padStart(8, "0")}`;
            const hasSnapshot = Boolean(o.gift_box_snapshot);
            return (
              <li
                key={o.id}
                className={cn(
                  "rounded-2xl border border-cb-border",
                  detailed ? "px-5 py-4" : "px-4 py-3",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cb-text-strong">
                      {t("accountOrders.orderNumber", { n: o.order_number })}
                      {o.order_code ? (
                        <span className="ms-2 font-mono text-[10px] text-cb-text-muted">
                          {o.order_code}
                        </span>
                      ) : null}
                      {o.order_type === "gift_box" ? (
                        <span className="ms-2 text-[10px] font-bold uppercase text-cb-terracotta-dark">
                          {t("accountOrders.giftBox")}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {formatPrice(Number(o.total_egp))} · {o.payment_status}
                    </p>
                    {showDate && o.created_at ? (
                      <p className="mt-1 text-[11px] text-cb-text-muted">
                        {t("accountOrders.placedOn", {
                          date: formatOrderDate(o.created_at, lang),
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/track?order=${encodeURIComponent(String(o.order_number))}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-cb-border bg-cb-surface px-3 py-1 text-[11px] font-semibold text-cb-text-strong transition hover:bg-cb-peach/40"
                      title={t("accountOrders.trackOrder")}
                    >
                      <Search className="h-3.5 w-3.5" />
                      {t("accountOrders.track")}
                    </Link>
                    <ReorderGiftBoxButton
                      orderId={o.id}
                      orderType={o.order_type}
                      hasSnapshot={hasSnapshot}
                    />
                    {hasSnapshot && o.reveal_token && o.payment_status === "paid" ? (
                      <GiftRevealLinkButton revealToken={o.reveal_token} />
                    ) : null}
                    <Link
                      href={`/invoices/${invoiceNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-cb-border bg-cb-surface px-3 py-1 text-[11px] font-semibold text-cb-text-strong transition hover:bg-cb-peach/40"
                      title={t("accountOrders.viewInvoice")}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t("accountOrders.invoice")}
                    </Link>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                        STATUS_BADGE[o.status] ?? "bg-slate-100 text-slate-800",
                      )}
                    >
                      {o.status}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl bg-cb-cream p-12 text-center">
          <div className="mb-6 inline-flex rounded-full bg-cb-peach/30 p-4">
            <Package className="h-12 w-12 text-cb-terracotta-dark" />
          </div>
          <h3 className="font-serif text-2xl font-semibold text-cb-text-strong">
            {t("accountOrders.emptyTitle")}
          </h3>
          <p className="mt-3 text-sm text-cb-text-muted">{t("accountOrders.emptyBody")}</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/shop"
              className={buttonClassName("primary", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
            >
              {t("accountOrders.startShopping")}
            </Link>
            <Link
              href="/gift-box"
              className={buttonClassName("outline", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
            >
              Shop Gift Boxes
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
