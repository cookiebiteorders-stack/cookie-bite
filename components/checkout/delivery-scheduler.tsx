"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, EyeOff, Gift, User } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import type { DeliverySchedulingState } from "@/lib/checkout/delivery-scheduling";
import { cn } from "@/lib/utils";

type SlotOption = {
  id: string;
  label: string;
  label_ar: string | null;
  available: number;
  is_full: boolean;
};

type Props = {
  value: DeliverySchedulingState;
  onChange: (next: DeliverySchedulingState) => void;
  className?: string;
};

export function DeliveryScheduler({ value, onChange, className }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const today = new Date();
  const minDate = today.toISOString().slice(0, 10);
  const maxDateObj = new Date(today);
  maxDateObj.setDate(maxDateObj.getDate() + 30);
  const maxDate = maxDateObj.toISOString().slice(0, 10);

  useEffect(() => {
    if (!value.deliveryDate) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    void fetch(`/api/delivery-slots?date=${encodeURIComponent(value.deliveryDate)}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          slots?: SlotOption[];
          error?: { en?: string; ar?: string };
        };
        if (!res.ok) {
          throw new Error(
            (ar && data.error?.ar) || data.error?.en || "Failed to load slots",
          );
        }
        if (!cancelled) setSlots(data.slots ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setSlotsError(e instanceof Error ? e.message : "Error");
          setSlots([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [value.deliveryDate, ar]);

  function patch(partial: Partial<DeliverySchedulingState>) {
    onChange({ ...value, ...partial });
  }

  function slotLabel(slot: SlotOption) {
    return ar && slot.label_ar ? slot.label_ar : slot.label;
  }

  return (
    <section
      className={cn(
        "space-y-5 rounded-2xl border border-cb-border bg-cb-surface-2 p-5",
        className,
      )}
      dir={ar ? "rtl" : "ltr"}
    >
      <h3 className="flex items-center gap-2 text-lg font-bold text-cb-text-strong">
        <Calendar className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
        {ar ? "جدولة التوصيل" : "Delivery schedule"}
      </h3>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-cb-text-strong">
          {ar ? "تاريخ التوصيل" : "Delivery date"}
        </label>
        <input
          type="date"
          min={minDate}
          max={maxDate}
          required
          value={value.deliveryDate}
          onChange={(e) => patch({ deliveryDate: e.target.value, slotId: "", slotLabel: "" })}
          className="w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3 text-sm outline-none focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus"
        />
      </div>

      {value.deliveryDate ? (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-cb-text-strong">
            <Clock className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
            {ar ? "خانة الوقت" : "Time slot"}
          </p>
          {slotsLoading ? (
            <p className="text-sm text-cb-text-muted">{ar ? "جاري التحميل…" : "Loading slots…"}</p>
          ) : null}
          {slotsError ? (
            <p className="text-sm font-medium text-red-700">{slotsError}</p>
          ) : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {slots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                disabled={slot.is_full}
                onClick={() =>
                  patch({ slotId: slot.id, slotLabel: slotLabel(slot) })
                }
                className={cn(
                  "rounded-xl border-2 p-3 text-start text-sm font-medium transition",
                  slot.is_full
                    ? "cursor-not-allowed border-cb-border bg-stone-100 text-stone-400"
                    : value.slotId === slot.id
                      ? "border-cb-terracotta-dark bg-cb-peach/40 text-cb-terracotta-dark"
                      : "border-cb-border bg-cb-surface text-cb-text-strong hover:border-cb-terracotta-dark/50",
                )}
              >
                <div>{slotLabel(slot)}</div>
                {!slot.is_full ? (
                  <div className="mt-1 text-xs text-cb-text-muted">
                    {ar
                      ? `${slot.available} مكان متاح`
                      : `${slot.available} spots left`}
                  </div>
                ) : (
                  <div className="mt-1 text-xs">{ar ? "ممتلئة" : "Full"}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-cb-border pt-4">
        <button
          type="button"
          onClick={() => patch({ isGift: !value.isGift })}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-start transition",
            value.isGift
              ? "border-cb-terracotta-dark bg-cb-peach/30"
              : "border-cb-border bg-cb-surface",
          )}
        >
          <Gift
            className={cn(
              "h-5 w-5 shrink-0",
              value.isGift ? "text-cb-terracotta-dark" : "text-cb-text-muted",
            )}
            aria-hidden
          />
          <span className="font-semibold text-cb-text-strong">
            {ar ? "إرسال كهدية لشخص آخر" : "Send as a gift to someone else"}
          </span>
        </button>
      </div>

      {value.isGift ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-semibold text-cb-text-strong">
                {ar ? "اسم المستلم" : "Recipient name"}
              </span>
              <input
                value={value.recipientName}
                onChange={(e) => patch({ recipientName: e.target.value })}
                className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm"
                placeholder={ar ? "محمد أحمد" : "Recipient name"}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-semibold text-cb-text-strong">
                {ar ? "جوال المستلم" : "Recipient phone"}
              </span>
              <input
                dir="ltr"
                inputMode="tel"
                value={value.recipientPhone}
                onChange={(e) => patch({ recipientPhone: e.target.value })}
                className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm"
                placeholder="01xxxxxxxxx"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-cb-text-strong">
              {ar ? "الشارع / المبنى" : "Street / building"}
            </span>
            <input
              value={value.recipientStreet}
              onChange={(e) => patch({ recipientStreet: e.target.value })}
              className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-sm font-semibold text-cb-text-strong">
                {ar ? "الحي" : "District"}
              </span>
              <input
                value={value.recipientDistrict}
                onChange={(e) => patch({ recipientDistrict: e.target.value })}
                className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-semibold text-cb-text-strong">
                {ar ? "المدينة" : "City"}
              </span>
              <input
                value={value.recipientCity}
                onChange={(e) => patch({ recipientCity: e.target.value })}
                className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={value.hidePrice}
              onChange={(e) => patch({ hidePrice: e.target.checked })}
              className="h-4 w-4 accent-cb-terracotta-dark"
            />
            <span className="flex items-center gap-2 text-sm text-cb-text-strong">
              <EyeOff className="h-4 w-4 text-cb-text-muted" aria-hidden />
              {ar ? "إخفاء السعر من الطلب" : "Hide price on the order"}
            </span>
          </label>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={value.anonymousSender}
              onChange={(e) => patch({ anonymousSender: e.target.checked })}
              className="h-4 w-4 accent-cb-terracotta-dark"
            />
            <span className="flex items-center gap-2 text-sm text-cb-text-strong">
              <User className="h-4 w-4 text-cb-text-muted" aria-hidden />
              {ar ? "إرسال من «مرسل سري»" : 'Send as "secret sender"'}
            </span>
          </label>

          {!value.anonymousSender ? (
            <label className="block space-y-1">
              <span className="text-sm font-semibold text-cb-text-strong">
                {ar ? "اسم المرسل على البطاقة" : "Sender name on card"}
              </span>
              <input
                value={value.senderName}
                onChange={(e) => patch({ senderName: e.target.value })}
                className="w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm"
              />
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-cb-text-strong">
              {ar ? "رسالة الهدية (اختياري)" : "Gift message (optional)"}
            </span>
            <textarea
              rows={3}
              maxLength={500}
              value={value.giftMessage}
              onChange={(e) => patch({ giftMessage: e.target.value })}
              className="w-full resize-none rounded-xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm"
            />
            <span className="text-xs text-cb-text-muted">{value.giftMessage.length}/500</span>
          </label>
        </div>
      ) : null}
    </section>
  );
}
