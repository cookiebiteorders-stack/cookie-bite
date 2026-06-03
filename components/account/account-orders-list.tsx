"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { ReorderGiftBoxButton } from "@/components/account/reorder-gift-box-button";
import { GiftRevealLinkButton } from "@/components/account/gift-reveal-link-button";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AccountOrderRow = {
  id: string;
  order_number: number;
  total_egp: number;
  payment_status: string;
  status: string;
  order_type?: string | null;
  gift_box_snapshot?: unknown;
  reveal_token?: string | null;
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
};

export function AccountOrdersList({ orders }: Props) {
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
                className="rounded-2xl border border-cb-border px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-cb-text-strong">
                      Order #{o.order_number}
                      {o.order_type === "gift_box" ? (
                        <span className="ms-2 text-[10px] font-bold uppercase text-cb-terracotta-dark">
                          Gift box
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {Number(o.total_egp).toFixed(0)} EGP · {o.payment_status}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                      title="View styled invoice"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Invoice
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
        <div className="rounded-2xl bg-cb-cream p-6 text-center">
          <p className="text-sm font-semibold text-cb-text-strong">No orders yet</p>
          <p className="mt-1 text-xs text-cb-text-muted">
            Explore the shop and your first box will appear here.
          </p>
          <Link href="/shop" className={buttonClassName("primary", "mt-4 inline-flex")}>
            Start shopping
          </Link>
        </div>
      )}
    </>
  );
}
