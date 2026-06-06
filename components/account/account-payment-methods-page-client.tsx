"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Pencil, Plus, Smartphone, Star, Trash2 } from "lucide-react";
import { AccountSidebar } from "@/components/account/account-sidebar";
import {
  EMPTY_PAYMENT_METHOD_FORM,
  PaymentMethodEditorForm,
  paymentMethodRowToFormValues,
  type PaymentMethodFormValues,
} from "@/components/account/payment-method-editor-form";
import { formatPaymentMethodSummary } from "@/lib/account/payment-method-display";
import { normalizePaymentMethodPayload } from "@/lib/account/payment-method-schema";
import type { SavedPaymentMethodRow } from "@/lib/db/payment-methods";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type Props = {
  userName: string;
  userEmail: string | null;
  avatarUrl: string | null;
  roleLabel: string;
  showAdminLinks: boolean;
  adminConsoleLinks?: AdminConsoleNavItem[];
  initialMethods: SavedPaymentMethodRow[];
};

type PanelMode = { type: "list" } | { type: "add" } | { type: "edit"; id: string };

function methodIcon(type: SavedPaymentMethodRow["method_type"]) {
  if (type === "card") return CreditCard;
  if (type === "cod") return Banknote;
  return Smartphone;
}

function toPayload(values: PaymentMethodFormValues) {
  return normalizePaymentMethodPayload({
    label: values.label.trim() || "Default",
    method_type: values.method_type,
    wallet_provider:
      values.method_type === "wallet"
        ? (values.wallet_provider as "vodafone" | "orange" | "etisalat" | "we" | "other")
        : null,
    account_hint: values.account_hint.trim() || null,
    card_last4: values.card_last4.trim() || null,
    cardholder_name: values.cardholder_name.trim() || null,
    is_default: values.is_default,
  });
}

export function AccountPaymentMethodsPageClient({
  userName,
  userEmail,
  avatarUrl,
  roleLabel,
  showAdminLinks,
  adminConsoleLinks = [],
  initialMethods,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [methods, setMethods] = useState(initialMethods);
  const [mode, setMode] = useState<PanelMode>({ type: "list" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => router.refresh(), [router]);

  const loadMethods = useCallback(async () => {
    const data = await fetchJson<{ methods: SavedPaymentMethodRow[] }>(
      "/api/account/payment-methods",
    );
    setMethods(data.methods);
  }, []);

  const handleSave = useCallback(
    async (values: PaymentMethodFormValues, methodId?: string) => {
      setSaving(true);
      setError(null);
      try {
        const payload = toPayload(values);
        if (methodId) {
          await fetchJson(`/api/account/payment-methods/${methodId}`, {
            method: "PATCH",
            jsonBody: payload,
          });
        } else {
          await fetchJson("/api/account/payment-methods", {
            method: "POST",
            jsonBody: payload,
          });
        }
        await loadMethods();
        setMode({ type: "list" });
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("accountPaymentMethods.saveError"));
      } finally {
        setSaving(false);
      }
    },
    [loadMethods, refresh, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t("accountPaymentMethods.deleteConfirm"))) return;
      setDeletingId(id);
      setError(null);
      try {
        await fetchJson(`/api/account/payment-methods/${id}`, { method: "DELETE" });
        await loadMethods();
        if (mode.type === "edit" && mode.id === id) setMode({ type: "list" });
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("accountPaymentMethods.deleteError"));
      } finally {
        setDeletingId(null);
      }
    },
    [loadMethods, mode, refresh, t],
  );

  const handleSetDefault = useCallback(
    async (row: SavedPaymentMethodRow) => {
      if (row.is_default) return;
      setSaving(true);
      setError(null);
      try {
        await fetchJson(`/api/account/payment-methods/${row.id}`, {
          method: "PATCH",
          jsonBody: { ...toPayload(paymentMethodRowToFormValues(row)), is_default: true },
        });
        await loadMethods();
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("accountPaymentMethods.saveError"));
      } finally {
        setSaving(false);
      }
    },
    [loadMethods, refresh, t],
  );

  const editing = mode.type === "edit" ? methods.find((m) => m.id === mode.id) : null;

  return (
    <div className="bg-cb-cream pb-24 pt-8 dark:bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 cb-gutter lg:flex-row">
        <AccountSidebar
          userName={userName}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          roleLabel={roleLabel}
          showAdminLinks={showAdminLinks}
          adminConsoleLinks={adminConsoleLinks}
        />

        <div className="min-w-0 flex-1 space-y-6">
          <header className="rounded-3xl border border-cb-peach-deep/40 bg-gradient-to-br from-cb-surface via-cb-cream to-cb-peach/25 p-6 shadow-sm ring-1 ring-cb-border/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cb-terracotta-dark">
                  {t("accountPaymentMethods.pageEyebrow")}
                </p>
                <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-cb-text-strong md:text-4xl">
                  {t("accountPaymentMethods.pageTitle")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cb-text-muted">
                  {t("accountPaymentMethods.pageSubtitle")}
                </p>
              </div>
              {mode.type === "list" ? (
                <button
                  type="button"
                  onClick={() => setMode({ type: "add" })}
                  className={buttonClassName(
                    "primary",
                    "inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm",
                  )}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  {t("accountPaymentMethods.addCta")}
                </button>
              ) : null}
            </div>
          </header>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {mode.type === "add" ? (
            <section className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border">
              <h2 className="mb-4 font-serif text-xl font-semibold text-cb-text-strong">
                {t("accountPaymentMethods.addTitle")}
              </h2>
              <PaymentMethodEditorForm
                initial={{
                  ...EMPTY_PAYMENT_METHOD_FORM,
                  label: t("accountPaymentMethods.defaultLabelNew"),
                  is_default: methods.length === 0,
                }}
                submitLabel={t("accountPaymentMethods.saveCta")}
                saving={saving}
                onCancel={() => setMode({ type: "list" })}
                onSubmit={(values) => handleSave(values)}
              />
            </section>
          ) : null}

          {mode.type === "edit" && editing ? (
            <section className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border">
              <h2 className="mb-4 font-serif text-xl font-semibold text-cb-text-strong">
                {t("accountPaymentMethods.editTitle")}
              </h2>
              <PaymentMethodEditorForm
                initial={paymentMethodRowToFormValues(editing)}
                submitLabel={t("accountPaymentMethods.updateCta")}
                saving={saving}
                onCancel={() => setMode({ type: "list" })}
                onSubmit={(values) => handleSave(values, editing.id)}
              />
            </section>
          ) : null}

          {mode.type === "list" ? (
            <section className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border">
              {methods.length ? (
                <ul className="space-y-3">
                  {methods.map((m) => {
                    const Icon = methodIcon(m.method_type);
                    return (
                      <li key={m.id} className="rounded-2xl border border-cb-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cb-peach/50 text-cb-terracotta-dark ring-1 ring-cb-border/60">
                              <Icon className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-cb-text-strong">
                                  {formatPaymentMethodSummary(m, t)}
                                </p>
                                {m.is_default ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-cb-peach px-2 py-0.5 text-[10px] font-bold text-cb-terracotta-dark">
                                    <Star className="h-3 w-3 fill-current" aria-hidden />
                                    {t("accountPaymentMethods.defaultBadge")}
                                  </span>
                                ) : null}
                              </div>
                              {m.cardholder_name ? (
                                <p className="mt-1 text-xs text-cb-text-muted">{m.cardholder_name}</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {!m.is_default ? (
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void handleSetDefault(m)}
                                className={cn(
                                  buttonClassName("outline"),
                                  "rounded-full px-3 py-1.5 text-[11px]",
                                )}
                              >
                                {t("accountPaymentMethods.setDefault")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setMode({ type: "edit", id: m.id })}
                              className="inline-flex items-center gap-1 rounded-full border border-cb-border px-3 py-1.5 text-[11px] font-semibold text-cb-text-strong hover:bg-cb-peach/40"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden />
                              {t("accountPaymentMethods.editCta")}
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === m.id}
                              onClick={() => void handleDelete(m.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              {deletingId === m.id
                                ? t("accountPaymentMethods.deleting")
                                : t("accountPaymentMethods.deleteCta")}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-2xl bg-cb-cream p-8 text-center">
                  <p className="text-sm font-semibold text-cb-text-strong">
                    {t("accountPaymentMethods.emptyTitle")}
                  </p>
                  <p className="mt-1 text-xs text-cb-text-muted">{t("accountPaymentMethods.emptyBody")}</p>
                  <button
                    type="button"
                    onClick={() => setMode({ type: "add" })}
                    className={buttonClassName("primary", "mt-4 inline-flex rounded-full px-6 py-2.5 text-sm")}
                  >
                    {t("accountPaymentMethods.addCta")}
                  </button>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
