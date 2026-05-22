"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BarChart3, Copy, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { AdminProductRow } from "@/lib/admin/products-dashboard-types";
import { cn } from "@/lib/utils";

export type ProductMenuAnchor = {
  productId: string;
  top: number;
  insetInlineEnd: number;
};

type Props = {
  product: AdminProductRow;
  open: boolean;
  anchor: ProductMenuAnchor | null;
  canWrite: boolean;
  canDelete: boolean;
  onOpen: (anchor: ProductMenuAnchor) => void;
  onClose: () => void;
  onEdit: (p: AdminProductRow) => void;
  onDuplicate: (p: AdminProductRow) => void;
  onDelete: (p: AdminProductRow) => void;
  onPreview: (p: AdminProductRow) => void;
};

const itemClass =
  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-cb-text-strong transition-colors hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-45 dark:hover:bg-amber-950/35";

export function ProductRowActionsMenu({
  product,
  open,
  anchor,
  canWrite,
  canDelete,
  onOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
}: Props) {
  const reduceMotion = useReducedMotion();
  const menuRef = useRef<HTMLUListElement>(null);
  const label = product.title_en ?? product.name;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent | PointerEvent) => {
      const root = document.getElementById(`product-actions-root-${product.id}`);
      const target = e.target as Node;
      if (root?.contains(target) || menuRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
    };
  }, [open, onClose, product.id]);

  const menu =
    open && anchor && anchor.productId === product.id ? (
      <motion.ul
        ref={menuRef}
        initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.98 }}
        transition={{ duration: 0.14 }}
        role="menu"
        aria-label={`إجراءات ${label}`}
        className="fixed z-[220] w-[min(14.5rem,calc(100vw-1.5rem))] rounded-2xl border border-cb-border bg-cb-surface-elevated p-1.5 text-start shadow-2xl ring-1 ring-black/5"
        style={{
          top: anchor.top,
          insetInlineEnd: anchor.insetInlineEnd,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <li>
          <button
            type="button"
            role="menuitem"
            disabled={!canWrite}
            className={itemClass}
            onClick={() => {
              onClose();
              onEdit(product);
            }}
          >
            <Pencil className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
            تعديل
          </button>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            disabled={!canWrite}
            className={itemClass}
            onClick={() => {
              onClose();
              onDuplicate(product);
            }}
          >
            <Copy className="h-4 w-4 shrink-0 text-cb-text-muted" aria-hidden />
            تكرار
          </button>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              onClose();
              onPreview(product);
            }}
          >
            <Eye className="h-4 w-4 shrink-0 text-cb-text-muted" aria-hidden />
            معاينة في المتجر
          </button>
        </li>
        <li>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={onClose}
          >
            <BarChart3 className="h-4 w-4 shrink-0 text-cb-text-muted" aria-hidden />
            تحليلات
          </button>
        </li>
        <li className="my-1 border-t border-cb-border" role="separator" />
        <li>
          <button
            type="button"
            role="menuitem"
            disabled={!canDelete}
            className={cn(itemClass, "text-red-600 hover:bg-red-50 dark:hover:bg-red-950/35")}
            onClick={() => {
              onClose();
              onDelete(product);
            }}
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            حذف
          </button>
        </li>
      </motion.ul>
    ) : null;

  return (
    <>
      <div id={`product-actions-root-${product.id}`} className="relative flex justify-end">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-cb-border/80 bg-cb-surface text-cb-text-strong shadow-sm transition hover:border-amber-300 hover:bg-amber-50 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400 dark:hover:bg-amber-950/25"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={`إجراءات ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            if (open) {
              onClose();
              return;
            }
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            const menuHeightEstimate = 280;
            const below = window.innerHeight - rect.bottom;
            const top =
              below >= menuHeightEstimate ? rect.bottom + 8 : Math.max(8, rect.top - menuHeightEstimate - 8);
            onOpen({
              productId: product.id,
              top,
              insetInlineEnd: window.innerWidth - rect.right,
            });
          }}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {typeof document !== "undefined"
        ? createPortal(<AnimatePresence>{menu}</AnimatePresence>, document.body)
        : null}
    </>
  );
}
