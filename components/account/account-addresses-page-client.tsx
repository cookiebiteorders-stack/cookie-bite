"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  AddressEditorForm,
  EMPTY_ADDRESS_FORM,
  addressRowToFormValues,
  type AddressFormValues,
} from "@/components/account/address-editor-form";
import { AccountSidebar } from "@/components/account/account-sidebar";
import type { AddressRowCompat } from "@/lib/db/addresses";
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
  initialAddresses: AddressRowCompat[];
};

type PanelMode = { type: "list" } | { type: "add" } | { type: "edit"; id: string };

function toPayload(values: AddressFormValues) {
  return {
    label: values.label.trim() || "Home",
    recipient: values.recipient.trim(),
    phone: values.phone.trim(),
    phone_secondary: values.phone_secondary.trim() || null,
    street: values.street.trim(),
    building: values.building.trim() || null,
    floor: values.floor.trim() || null,
    apartment: values.apartment.trim() || null,
    city: values.city.trim(),
    governorate: values.governorate.trim(),
    delivery_notes: values.delivery_notes.trim() || null,
    latitude: values.latitude,
    longitude: values.longitude,
    is_default: values.is_default,
  };
}

export function AccountAddressesPageClient({
  userName,
  userEmail,
  avatarUrl,
  roleLabel,
  showAdminLinks,
  adminConsoleLinks = [],
  initialAddresses,
}: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [mode, setMode] = useState<PanelMode>({ type: "list" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const loadAddresses = useCallback(async () => {
    const data = await fetchJson<{ addresses: AddressRowCompat[] }>("/api/account/addresses");
    setAddresses(data.addresses);
  }, []);

  const handleSave = useCallback(
    async (values: AddressFormValues, addressId?: string) => {
      setSaving(true);
      setError(null);
      try {
        if (addressId) {
          await fetchJson(`/api/account/addresses/${addressId}`, {
            method: "PATCH",
            jsonBody: toPayload(values),
          });
        } else {
          await fetchJson("/api/account/addresses", {
            method: "POST",
            jsonBody: toPayload(values),
          });
        }
        await loadAddresses();
        setMode({ type: "list" });
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("accountAddresses.saveError"));
      } finally {
        setSaving(false);
      }
    },
    [loadAddresses, refresh, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t("accountAddresses.deleteConfirm"))) return;
      setDeletingId(id);
      setError(null);
      try {
        await fetchJson(`/api/account/addresses/${id}`, { method: "DELETE" });
        await loadAddresses();
        if (mode.type === "edit" && mode.id === id) setMode({ type: "list" });
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("accountAddresses.deleteError"));
      } finally {
        setDeletingId(null);
      }
    },
    [loadAddresses, mode, refresh, t],
  );

  const handleSetDefault = useCallback(
    async (row: AddressRowCompat) => {
      if (row.is_default) return;
      setSaving(true);
      setError(null);
      try {
        await fetchJson(`/api/account/addresses/${row.id}`, {
          method: "PATCH",
          jsonBody: {
            ...toPayload(addressRowToFormValues(row)),
            is_default: true,
          },
        });
        await loadAddresses();
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : t("accountAddresses.saveError"));
      } finally {
        setSaving(false);
      }
    },
    [loadAddresses, refresh, t],
  );

  const editing = mode.type === "edit" ? addresses.find((a) => a.id === mode.id) : null;

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
                  {t("accountAddresses.pageEyebrow")}
                </p>
                <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-cb-text-strong md:text-4xl">
                  {t("accountAddresses.pageTitle")}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cb-text-muted">
                  {t("accountAddresses.pageSubtitle")}
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
                  {t("accountAddresses.addCta")}
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
                {t("accountAddresses.addTitle")}
              </h2>
              <AddressEditorForm
                initial={{
                  ...EMPTY_ADDRESS_FORM,
                  is_default: addresses.length === 0,
                }}
                submitLabel={t("accountAddresses.saveCta")}
                saving={saving}
                onCancel={() => setMode({ type: "list" })}
                onSubmit={(values) => handleSave(values)}
              />
            </section>
          ) : null}

          {mode.type === "edit" && editing ? (
            <section className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border">
              <h2 className="mb-4 font-serif text-xl font-semibold text-cb-text-strong">
                {t("accountAddresses.editTitle")}
              </h2>
              <AddressEditorForm
                initial={addressRowToFormValues(editing)}
                submitLabel={t("accountAddresses.updateCta")}
                saving={saving}
                onCancel={() => setMode({ type: "list" })}
                onSubmit={(values) => handleSave(values, editing.id)}
              />
            </section>
          ) : null}

          {mode.type === "list" ? (
            <section className="rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border">
              {addresses.length ? (
                <ul className="space-y-3">
                  {addresses.map((a) => (
                    <li
                      key={a.id}
                      className="rounded-2xl border border-cb-border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-cb-text-strong">
                              {a.label ?? a.recipient ?? t("accountAddresses.fallbackLabel")}
                            </p>
                            {a.is_default ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-cb-peach px-2 py-0.5 text-[10px] font-bold text-cb-terracotta-dark">
                                <Star className="h-3 w-3 fill-current" aria-hidden />
                                {t("accountAddresses.defaultBadge")}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-cb-text-muted">
                            {a.recipient} · {a.phone}
                            {a.phone_secondary ? ` · ${a.phone_secondary}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-cb-text-muted">
                            {a.street}
                            {a.building && a.building !== "-" ? `, ${a.building}` : ""}
                            {a.floor ? `, ${t("accountAddresses.floorShort")} ${a.floor}` : ""}
                            {a.apartment ? `, ${t("accountAddresses.aptShort")} ${a.apartment}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-cb-text-muted">
                            {a.city}
                            {a.governorate ? `, ${a.governorate}` : ""}
                          </p>
                          {a.latitude != null && a.longitude != null ? (
                            <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-cb-text-muted">
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                              {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}
                            </p>
                          ) : null}
                          {a.delivery_notes ? (
                            <p className="mt-2 text-xs text-cb-text-muted">{a.delivery_notes}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {!a.is_default ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handleSetDefault(a)}
                              className={cn(
                                buttonClassName("outline"),
                                "rounded-full px-3 py-1.5 text-[11px]",
                              )}
                            >
                              {t("accountAddresses.setDefault")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setMode({ type: "edit", id: a.id })}
                            className="inline-flex items-center gap-1 rounded-full border border-cb-border px-3 py-1.5 text-[11px] font-semibold text-cb-text-strong hover:bg-cb-peach/40"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            {t("accountAddresses.editCta")}
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === a.id}
                            onClick={() => void handleDelete(a.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            {deletingId === a.id
                              ? t("accountAddresses.deleting")
                              : t("accountAddresses.deleteCta")}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-2xl bg-cb-cream p-8 text-center">
                  <p className="text-sm font-semibold text-cb-text-strong">
                    {t("accountAddresses.emptyTitle")}
                  </p>
                  <p className="mt-1 text-xs text-cb-text-muted">{t("accountAddresses.emptyBody")}</p>
                  <button
                    type="button"
                    onClick={() => setMode({ type: "add" })}
                    className={buttonClassName("primary", "mt-4 inline-flex rounded-full px-6 py-2.5 text-sm")}
                  >
                    {t("accountAddresses.addCta")}
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
