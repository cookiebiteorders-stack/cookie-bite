"use client";

import { useState } from "react";
import {
  PAYMENT_METHOD_TYPES,
  WALLET_PROVIDERS,
  type PaymentMethodType,
} from "@/lib/account/payment-method-schema";
import type { SavedPaymentMethodRow } from "@/lib/db/payment-methods";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm text-cb-text-strong placeholder:text-cb-text-muted";

export type PaymentMethodFormValues = {
  label: string;
  method_type: PaymentMethodType;
  wallet_provider: string;
  account_hint: string;
  card_last4: string;
  cardholder_name: string;
  is_default: boolean;
};

export const EMPTY_PAYMENT_METHOD_FORM: PaymentMethodFormValues = {
  label: "",
  method_type: "wallet",
  wallet_provider: "vodafone",
  account_hint: "",
  card_last4: "",
  cardholder_name: "",
  is_default: false,
};

export function paymentMethodRowToFormValues(row: SavedPaymentMethodRow): PaymentMethodFormValues {
  return {
    label: row.label,
    method_type: row.method_type,
    wallet_provider: row.wallet_provider ?? "vodafone",
    account_hint: row.account_hint ?? "",
    card_last4: row.card_last4 ?? "",
    cardholder_name: row.cardholder_name ?? "",
    is_default: Boolean(row.is_default),
  };
}

type Props = {
  initial: PaymentMethodFormValues;
  submitLabel: string;
  saving?: boolean;
  onSubmit: (values: PaymentMethodFormValues) => void | Promise<void>;
  onCancel?: () => void;
};

export function PaymentMethodEditorForm({
  initial,
  submitLabel,
  saving = false,
  onSubmit,
  onCancel,
}: Props) {
  const { t } = useLanguage();
  const [form, setForm] = useState<PaymentMethodFormValues>(initial);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(form);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-cb-text-muted">
            {t("accountPaymentMethods.labelField")}
          </span>
          <input
            className={inputClass}
            required
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder={t("accountPaymentMethods.labelPlaceholder")}
          />
        </label>

        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold text-cb-text-muted">
            {t("accountPaymentMethods.typeField")}
          </span>
          <select
            className={inputClass}
            value={form.method_type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                method_type: e.target.value as PaymentMethodType,
              }))
            }
          >
            {PAYMENT_METHOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`accountPaymentMethods.types.${type}`)}
              </option>
            ))}
          </select>
        </label>

        {form.method_type === "card" ? (
          <>
            <p className="sm:col-span-2 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
              {t("accountPaymentMethods.cardSecurityNote")}
            </p>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-cb-text-muted">
                {t("accountPaymentMethods.cardLast4")}
              </span>
              <input
                className={inputClass}
                inputMode="numeric"
                maxLength={4}
                pattern="\d{4}"
                placeholder="1234"
                value={form.card_last4}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    card_last4: e.target.value.replace(/\D/g, "").slice(0, 4),
                  }))
                }
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-cb-text-muted">
                {t("accountPaymentMethods.cardholder")}
              </span>
              <input
                className={inputClass}
                value={form.cardholder_name}
                onChange={(e) => setForm((f) => ({ ...f, cardholder_name: e.target.value }))}
              />
            </label>
          </>
        ) : null}

        {form.method_type === "wallet" ? (
          <>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-cb-text-muted">
                {t("accountPaymentMethods.walletProvider")}
              </span>
              <select
                className={inputClass}
                value={form.wallet_provider}
                onChange={(e) => setForm((f) => ({ ...f, wallet_provider: e.target.value }))}
              >
                {WALLET_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {t(`accountPaymentMethods.walletProviders.${p}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-cb-text-muted">
                {t("accountPaymentMethods.walletPhone")}
              </span>
              <input
                className={inputClass}
                required
                inputMode="tel"
                placeholder="01xxxxxxxxx"
                value={form.account_hint}
                onChange={(e) => setForm((f) => ({ ...f, account_hint: e.target.value }))}
              />
            </label>
          </>
        ) : null}

        {form.method_type === "instapay" ? (
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-cb-text-muted">
              {t("accountPaymentMethods.instapayId")}
            </span>
            <input
              className={inputClass}
              required
              value={form.account_hint}
              onChange={(e) => setForm((f) => ({ ...f, account_hint: e.target.value }))}
              placeholder={t("accountPaymentMethods.instapayPlaceholder")}
            />
          </label>
        ) : null}

        {form.method_type === "fawry" ? (
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-cb-text-muted">
              {t("accountPaymentMethods.fawryRef")}
            </span>
            <input
              className={inputClass}
              required
              value={form.account_hint}
              onChange={(e) => setForm((f) => ({ ...f, account_hint: e.target.value }))}
              placeholder={t("accountPaymentMethods.fawryPlaceholder")}
            />
          </label>
        ) : null}

        {form.method_type === "cod" ? (
          <p className="sm:col-span-2 text-xs text-cb-text-muted">
            {t("accountPaymentMethods.codHint")}
          </p>
        ) : null}

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            className="h-4 w-4 rounded border-cb-border text-cb-terracotta-dark"
          />
          <span className="text-sm font-medium text-cb-text-strong">
            {t("accountPaymentMethods.defaultCheckbox")}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className={buttonClassName("primary", "rounded-full px-6 py-2.5 text-sm")}
        >
          {saving ? t("accountPaymentMethods.saving") : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={saving}
            onClick={onCancel}
            className={cn(buttonClassName("outline"), "rounded-full px-6 py-2.5 text-sm")}
          >
            {t("accountPaymentMethods.cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
