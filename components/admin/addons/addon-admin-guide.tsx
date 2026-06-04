"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAdminBilingual } from "@/components/admin/admin-bilingual-label";
import {
  buildAddonFromTemplate,
  listAddonTemplates,
  type AddonTemplateId,
} from "@/lib/addons/admin-templates";
import type { Addon } from "@/lib/addons/types";
import { cn } from "@/lib/utils";

type Props = {
  onApplyTemplate: (form: Addon, defaultPrice: number) => void;
};

export function AddonAdminGuide({ onApplyTemplate }: Props) {
  const pick = useAdminBilingual();
  const [open, setOpen] = useState(true);

  function apply(id: AddonTemplateId) {
    const form = buildAddonFromTemplate(id);
    const defaultPrice =
      form.options.find((o) => o.default_selected)?.price ??
      form.options[0]?.price ??
      0;
    onApplyTemplate(form, defaultPrice);
  }

  return (
    <div className="rounded-xl border border-cb-terracotta-dark/25 bg-cb-peach/15 p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-cb-text-strong">
          {pick({
            en: "Quick guide — extras with products (not gift box)",
            ar: "دليل سريع — إضافات مع المنتج (مش صندوق هدايا)",
          })}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="mt-3 space-y-3 text-sm text-cb-text-strong">
          <ol className="list-decimal space-y-1.5 ps-5 leading-relaxed">
            <li>
              {pick({
                en: "Name the add-on (e.g. Chocolate cup) and pick single vs multiple choice.",
                ar: "سمِّ الإضافة (مثلاً: كوب شوكولاتة) واختر: اختيار واحد أو متعدد.",
              })}
            </li>
            <li>
              {pick({
                en: "Each table row is one choice for the customer (name + price in EGP).",
                ar: "كل صف في الجدول = خيار للعميل (الاسم + السعر بالجنيه).",
              })}
            </li>
            <li>
              {pick({
                en: "Select products below, then «Create & Link» — or link later from the product edit screen.",
                ar: "حدّد المنتجات ثم «إنشاء وربط» — أو اربط لاحقاً من تعديل المنتج.",
              })}
            </li>
            <li>
              {pick({
                en: "Each add-on appears once per product — duplicates are removed automatically.",
                ar: "كل إضافة تظهر مرة واحدة على المنتج — التكرار يُزال تلقائياً.",
              })}
            </li>
          </ol>

          <div>
            <p className="mb-2 text-xs font-semibold text-cb-text-muted">
              {pick({
                en: "Fill a ready example (edit prices if needed):",
                ar: "املأ مثالاً جاهزاً (عدّل الأسعار لو حابب):",
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              {listAddonTemplates().map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="rounded-full border border-cb-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-cb-surface-2"
                  onClick={() => apply(t.id)}
                >
                  {pick({ en: t.labelEn, ar: t.labelAr })}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
