"use client";

import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useMemo, useState } from "react";
import { MapPin, Truck } from "lucide-react";
import {
  AddressEditorForm,
  EMPTY_ADDRESS_FORM,
  type AddressFormValues,
} from "@/components/account/address-editor-form";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { useStoreShippingZones } from "@/components/providers/store-shipping-zones-provider";
import { buttonClassName } from "@/components/ui/button";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

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
    is_default: true,
  };
}

export function ShippingDeliveryPageBody() {
  const { t } = useLanguage();
  const { zones, loaded: zonesLoaded } = useStoreShippingZones();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const [selectedAreaKey, setSelectedAreaKey] = useState<string | null>(null);
  const [formSeed, setFormSeed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const displayName = useMemo(() => {
    const fromClerk =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
      user?.username ||
      "";
    return fromClerk || "";
  }, [user?.firstName, user?.lastName, user?.username]);

  const selectedArea = useMemo(() => {
    if (!selectedAreaKey) return null;
    for (const zone of zones) {
      const items = zone.cities.length > 0 ? zone.cities : [zone.name];
      for (const city of items) {
        const key = `${zone.id}:${city}`;
        if (key === selectedAreaKey) {
          return { zoneName: zone.name, city };
        }
      }
    }
    return null;
  }, [selectedAreaKey, zones]);

  const formInitial = useMemo((): AddressFormValues => {
    const base: AddressFormValues = {
      ...EMPTY_ADDRESS_FORM,
      recipient: displayName,
      is_default: true,
    };
    if (!selectedArea) return base;
    const notes = selectedArea.zoneName
      ? `${t("pages.shippingDelivery.areaNotePrefix")} ${selectedArea.zoneName}`
      : "";
    return {
      ...base,
      city: selectedArea.city,
      delivery_notes: notes,
    };
  }, [displayName, selectedArea, t]);

  const pickArea = useCallback((zoneId: string, city: string) => {
    setSelectedAreaKey(`${zoneId}:${city}`);
    setFormSeed((n) => n + 1);
    setSaved(false);
    setError(null);
  }, []);

  const handleSave = useCallback(
    async (values: AddressFormValues) => {
      if (!isSignedIn) return;
      setSaving(true);
      setError(null);
      try {
        await fetchJson("/api/account/addresses", {
          method: "POST",
          jsonBody: toPayload(values),
        });
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("pages.shippingDelivery.saveError"));
      } finally {
        setSaving(false);
      }
    },
    [isSignedIn, t],
  );

  const hasZones = zones.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 text-center lg:px-6">
      <SectionHeading
        align="center"
        className="text-center"
        eyebrow={t("pages.shippingDelivery.eyebrow")}
        title={t("pages.shippingDelivery.title")}
        subtitle={t("pages.shippingDelivery.subtitle")}
      />

      <section className="mt-10 text-start">
        <h2 className="inline-flex items-center gap-2 font-serif text-xl font-semibold text-cb-text-strong">
          <Truck className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
          {t("pages.shippingDelivery.zonesTitle")}
        </h2>

        {!zonesLoaded ? (
          <p className="mt-4 text-sm text-cb-text-muted">{t("pages.shippingDelivery.zonesLoading")}</p>
        ) : hasZones ? (
          <div className="mt-6 space-y-6">
            <p className="text-sm text-cb-text">{t("pages.shippingDelivery.zonesHint")}</p>
            {zones.map((zone) => {
              const items = zone.cities.length > 0 ? zone.cities : [zone.name];
              return (
                <div key={zone.id}>
                  <h3 className="mb-3 font-serif text-lg font-semibold text-cb-text-strong">
                    {zone.name}
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {items.map((city) => {
                      const key = `${zone.id}:${city}`;
                      const active = selectedAreaKey === key;
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => pickArea(zone.id, city)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                              active
                                ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white"
                                : "border-cb-border bg-cb-surface text-cb-text hover:border-cb-terracotta-dark/50",
                            )}
                          >
                            {city}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-cb-border bg-cb-surface/80 px-5 py-6 text-center">
            <p className="text-sm font-semibold text-cb-text-strong">
              {t("pages.shippingDelivery.noZonesTitle")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-cb-text">
              {t("pages.shippingDelivery.noZonesBody")}
            </p>
          </div>
        )}
      </section>

      <section className="mt-12 rounded-3xl border border-cb-border bg-cb-surface p-6 text-start shadow-sm sm:p-8">
        <h2 className="inline-flex items-center gap-2 font-serif text-xl font-semibold text-cb-text-strong">
          <MapPin className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
          {t("pages.shippingDelivery.addressTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-cb-text">
          {t("pages.shippingDelivery.addressSubtitle")}
        </p>

        {!isSignedIn ? (
          <div className="mt-6 rounded-2xl bg-cb-brand-50/80 px-4 py-5 text-center">
            <p className="text-sm text-cb-text">{t("pages.shippingDelivery.signInPrompt")}</p>
            <Link
              href="/sign-in?redirect_url=/shipping"
              className={buttonClassName("primary", "mt-4 inline-flex rounded-full px-6 py-2.5 text-sm")}
            >
              {t("pages.shippingDelivery.signInCta")}
            </Link>
          </div>
        ) : (
          <>
            {saved ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-sm text-emerald-900">
                <p className="font-semibold">{t("pages.shippingDelivery.savedTitle")}</p>
                <p className="mt-1">{t("pages.shippingDelivery.savedBody")}</p>
                <Link
                  href="/account/addresses"
                  className="mt-3 inline-block font-bold text-emerald-800 underline"
                >
                  {t("pages.shippingDelivery.viewAddresses")}
                </Link>
              </div>
            ) : null}
            {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
            <div className="mt-6">
              <AddressEditorForm
                key={formSeed}
                initial={formInitial}
                submitLabel={t("pages.shippingDelivery.saveCta")}
                saving={saving}
                onSubmit={handleSave}
              />
            </div>
          </>
        )}
      </section>

      <p className="mt-8 text-sm text-cb-text-muted">
        {t("pages.shippingDelivery.footerNote")}{" "}
        <Link href="/contact" className="font-bold text-cb-terracotta-dark underline">
          {t("pages.shippingDelivery.contactLink")}
        </Link>
      </p>
    </div>
  );
}
