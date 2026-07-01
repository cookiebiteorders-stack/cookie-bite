"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Gift,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AdminPageIntro } from "@/components/admin/admin-page-intro";
import { useAdminT } from "@/lib/admin/use-admin-t";
import { computeOfferPricing } from "@/lib/offers/pricing";
import type {
  EnrichedBundleOffer,
  OfferCatalogAddonOption,
  OfferCatalogProduct,
} from "@/lib/offers/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OfferFormState = {
  name_en: string;
  name_ar: string;
  product_ids: string[];
  addon_keys: string[];
  offer_price_egp: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY_FORM: OfferFormState = {
  name_en: "",
  name_ar: "",
  product_ids: [],
  addon_keys: [],
  offer_price_egp: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

function addonKey(addon: Pick<OfferCatalogAddonOption, "addon_id" | "option_id">) {
  return `${addon.addon_id}:${addon.option_id}`;
}

function parseAddonKey(key: string) {
  const [addon_id, option_id] = key.split(":");
  return { addon_id, option_id };
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function defaultStartsAt() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function offerToForm(offer: EnrichedBundleOffer): OfferFormState {
  return {
    name_en: offer.name_en,
    name_ar: offer.name_ar,
    product_ids: [...offer.product_ids],
    addon_keys: offer.addons.map((a) => addonKey(a)),
    offer_price_egp: String(offer.offer_price_egp),
    starts_at: toDatetimeLocal(offer.starts_at),
    ends_at: toDatetimeLocal(offer.ends_at),
    is_active: offer.is_active,
  };
}

function productLabel(product: OfferCatalogProduct, lang: "en" | "ar") {
  if (lang === "ar") return product.title_ar || product.name;
  return product.title_en || product.name;
}

export function OffersAdminDashboard() {
  const { adminT, apiErr, lang } = useAdminT();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<EnrichedBundleOffer[]>([]);
  const [products, setProducts] = useState<OfferCatalogProduct[]>([]);
  const [addons, setAddons] = useState<OfferCatalogAddonOption[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, products_count: 0, addons_count: 0 });
  const [productSearch, setProductSearch] = useState("");
  const [addonSearch, setAddonSearch] = useState("");
  const [form, setForm] = useState<OfferFormState>({ ...EMPTY_FORM, starts_at: defaultStartsAt() });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/offers");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(apiErr(json.error, adminT("offers.errors.loadFailed")));
      }
      setOffers(json.offers ?? []);
      setProducts(json.catalog?.products ?? []);
      setAddons(json.catalog?.addons ?? []);
      setStats(json.stats ?? { total: 0, active: 0, products_count: 0, addons_count: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : adminT("offers.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [adminT, apiErr]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const hay = [
        p.name,
        p.title_en,
        p.title_ar,
        p.sku,
        p.category,
        p.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [products, productSearch]);

  const filteredAddons = useMemo(() => {
    const q = addonSearch.trim().toLowerCase();
    if (!q) return addons;
    return addons.filter((a) => {
      const hay = [a.addon_name, a.category_name, a.option_name].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [addons, addonSearch]);

  const selectedAddonItems = useMemo(
    () => form.addon_keys.map(parseAddonKey).filter((a) => a.addon_id && a.option_id),
    [form.addon_keys],
  );

  const livePricing = useMemo(() => {
    const offerPrice = Number(form.offer_price_egp);
    if (!Number.isFinite(offerPrice) || offerPrice <= 0) return null;
    return computeOfferPricing({
      productIds: form.product_ids,
      addonItems: selectedAddonItems,
      offerPriceEgp: offerPrice,
      products,
      addonOptions: addons,
    });
  }, [addons, form.offer_price_egp, form.product_ids, products, selectedAddonItems]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM, starts_at: defaultStartsAt() });
    setEditingId(null);
  };

  const toggleProduct = (id: string) => {
    setForm((prev) => ({
      ...prev,
      product_ids: prev.product_ids.includes(id)
        ? prev.product_ids.filter((x) => x !== id)
        : [...prev.product_ids, id],
    }));
  };

  const toggleAddon = (key: string) => {
    setForm((prev) => ({
      ...prev,
      addon_keys: prev.addon_keys.includes(key)
        ? prev.addon_keys.filter((x) => x !== key)
        : [...prev.addon_keys, key],
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name_en: form.name_en.trim(),
      name_ar: form.name_ar.trim(),
      product_ids: form.product_ids,
      addon_items: selectedAddonItems,
      offer_price_egp: Number(form.offer_price_egp),
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
    };

    try {
      const res = await fetch(editingId ? `/api/admin/offers/${editingId}` : "/api/admin/offers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json.en === "string"
            ? apiErr(json, adminT("offers.errors.saveFailed"))
            : apiErr(json.error, adminT("offers.errors.saveFailed")),
        );
      }
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : adminT("offers.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(adminT("offers.confirmDelete"))) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/offers/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(apiErr(json.error, adminT("offers.errors.deleteFailed")));
      }
      if (editingId === id) resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : adminT("offers.errors.deleteFailed"));
    }
  };

  const handleEdit = (offer: EnrichedBundleOffer) => {
    setEditingId(offer.id);
    setForm(offerToForm(offer));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminPageIntro titleKey="adminPages.offers.title" subtitleKey="adminPages.offers.subtitle" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: adminT("offers.metrics.total"), value: stats.total, icon: Gift },
          { label: adminT("offers.metrics.active"), value: stats.active, icon: Sparkles },
          { label: adminT("offers.metrics.products"), value: stats.products_count, icon: Package },
          { label: adminT("offers.metrics.addons"), value: stats.addons_count, icon: Plus },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-[#E8DDD0] bg-white/80 p-4 shadow-sm backdrop-blur"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9C8B7A]">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-[#3D2914]">{value}</p>
              </div>
              <div className="rounded-xl bg-[#FFF7ED] p-2 text-[#C45B28]">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr_1.1fr]">
        <section className="rounded-2xl border border-[#E8DDD0] bg-white/90 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#3D2914]">{adminT("offers.productsTitle")}</h2>
              <p className="text-sm text-[#9C8B7A]">{adminT("offers.productsHint")}</p>
            </div>
            <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#C45B28]">
              {form.product_ids.length} {adminT("offers.selected")}
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9C8B7A]" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder={adminT("offers.searchProducts")}
              className="w-full rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] py-2.5 ps-10 pe-3 text-sm outline-none focus:border-[#C45B28]"
            />
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pe-1">
            {filteredProducts.map((product) => {
              const selected = form.product_ids.includes(product.id);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-start transition",
                    selected
                      ? "border-[#C45B28] bg-[#FFF7ED]"
                      : "border-[#E8DDD0] bg-[#FFFBF7] hover:border-[#D4C4B0]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#3D2914]">{productLabel(product, lang)}</p>
                      <p className="mt-1 text-xs text-[#9C8B7A]">
                        {product.sku || "—"} · {product.category || adminT("offers.noCategory")}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-[#7A6654]">
                        {lang === "ar" ? product.description_ar : product.description_en}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-semibold text-[#C45B28]">
                        {Number(product.price_egp).toFixed(0)} EGP
                      </p>
                      <p className="text-xs text-[#9C8B7A]">
                        {adminT("offers.stock")}: {product.stock}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {!loading && filteredProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#9C8B7A]">{adminT("offers.noProducts")}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E8DDD0] bg-white/90 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#3D2914]">{adminT("offers.addonsTitle")}</h2>
              <p className="text-sm text-[#9C8B7A]">{adminT("offers.addonsHint")}</p>
            </div>
            <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#C45B28]">
              {form.addon_keys.length} {adminT("offers.selected")}
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9C8B7A]" />
            <input
              value={addonSearch}
              onChange={(e) => setAddonSearch(e.target.value)}
              placeholder={adminT("offers.searchAddons")}
              className="w-full rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] py-2.5 ps-10 pe-3 text-sm outline-none focus:border-[#C45B28]"
            />
          </div>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pe-1">
            {filteredAddons.map((addon) => {
              const key = addonKey(addon);
              const selected = form.addon_keys.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleAddon(key)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-start transition",
                    selected
                      ? "border-[#C45B28] bg-[#FFF7ED]"
                      : "border-[#E8DDD0] bg-[#FFFBF7] hover:border-[#D4C4B0]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#3D2914]">{addon.option_name}</p>
                      <p className="mt-1 text-xs text-[#9C8B7A]">
                        {addon.category_name} · {addon.selection_type}
                      </p>
                      <p className="mt-1 text-xs text-[#7A6654]">
                        {addon.weight_grams ? `${addon.weight_grams}g · ` : ""}
                        {addon.required ? adminT("offers.requiredAddon") : adminT("offers.optionalAddon")}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm font-semibold text-[#C45B28]">
                        {Number(addon.price).toFixed(0)} EGP
                      </p>
                      <p className="text-xs text-[#9C8B7A]">
                        {adminT("offers.stock")}: {addon.stock ?? "∞"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            {!loading && filteredAddons.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#9C8B7A]">{adminT("offers.noAddons")}</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E8DDD0] bg-white/90 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#3D2914]">
                {editingId ? adminT("offers.editTitle") : adminT("offers.createTitle")}
              </h2>
              <p className="text-sm text-[#9C8B7A]">{adminT("offers.createHint")}</p>
            </div>
            {editingId ? (
              <Button type="button" variant="outline" className="min-h-9 px-4 py-2 text-xs" onClick={resetForm}>
                <X className="h-4 w-4" />
                {adminT("offers.cancelEdit")}
              </Button>
            ) : null}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#7A6654]">{adminT("offers.fields.nameEn")}</span>
                <input
                  required
                  value={form.name_en}
                  onChange={(e) => setForm((prev) => ({ ...prev, name_en: e.target.value }))}
                  className="w-full rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] px-3 py-2.5 text-sm outline-none focus:border-[#C45B28]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#7A6654]">{adminT("offers.fields.nameAr")}</span>
                <input
                  required
                  value={form.name_ar}
                  onChange={(e) => setForm((prev) => ({ ...prev, name_ar: e.target.value }))}
                  className="w-full rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] px-3 py-2.5 text-sm outline-none focus:border-[#C45B28]"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[#7A6654]">{adminT("offers.fields.offerPrice")}</span>
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={form.offer_price_egp}
                onChange={(e) => setForm((prev) => ({ ...prev, offer_price_egp: e.target.value }))}
                className="w-full rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] px-3 py-2.5 text-sm outline-none focus:border-[#C45B28]"
              />
            </label>

            {livePricing ? (
              <div className="rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#7A6654]">{adminT("offers.originalTotal")}</span>
                  <span className="font-medium text-[#3D2914]">
                    {livePricing.original_total_egp.toFixed(2)} EGP
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[#7A6654]">{adminT("offers.savings")}</span>
                  <span className="font-medium text-emerald-700">
                    {livePricing.savings_egp.toFixed(2)} EGP
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[#7A6654]">{adminT("offers.avgPerProduct")}</span>
                  <span className="font-medium text-[#C45B28]">
                    {livePricing.avg_price_per_product_egp != null
                      ? `${livePricing.avg_price_per_product_egp.toFixed(2)} EGP`
                      : "—"}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#7A6654]">{adminT("offers.fields.startsAt")}</span>
                <input
                  required
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                  className="w-full rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] px-3 py-2.5 text-sm outline-none focus:border-[#C45B28]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[#7A6654]">{adminT("offers.fields.endsAt")}</span>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))}
                  className="w-full rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] px-3 py-2.5 text-sm outline-none focus:border-[#C45B28]"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-[#E8DDD0] bg-[#FFFBF7] px-3 py-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-[#D4C4B0]"
              />
              <span className="text-sm text-[#3D2914]">{adminT("offers.fields.isActive")}</span>
            </label>

            <Button type="submit" disabled={saving} className="w-full">
              {saving
                ? adminT("offers.saving")
                : editingId
                  ? adminT("offers.updateOffer")
                  : adminT("offers.createOffer")}
            </Button>
          </form>
        </section>
      </div>

      <section className="rounded-2xl border border-[#E8DDD0] bg-white/90 p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#3D2914]">{adminT("offers.listTitle")}</h2>
            <p className="text-sm text-[#9C8B7A]">{adminT("offers.listHint")}</p>
          </div>
          <Button type="button" variant="outline" className="min-h-9 px-4 py-2 text-xs" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {adminT("offers.refresh")}
          </Button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-[#9C8B7A]">{adminT("offers.loading")}</p>
        ) : offers.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#9C8B7A]">{adminT("offers.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#E8DDD0] text-start text-xs uppercase tracking-wide text-[#9C8B7A]">
                  <th className="px-3 py-3">{adminT("offers.cols.name")}</th>
                  <th className="px-3 py-3">{adminT("offers.cols.items")}</th>
                  <th className="px-3 py-3">{adminT("offers.cols.price")}</th>
                  <th className="px-3 py-3">{adminT("offers.cols.avg")}</th>
                  <th className="px-3 py-3">{adminT("offers.cols.dates")}</th>
                  <th className="px-3 py-3">{adminT("offers.cols.status")}</th>
                  <th className="px-3 py-3">{adminT("offers.cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => {
                  const name = lang === "ar" ? offer.name_ar : offer.name_en;
                  const statusLabel = offer.is_currently_valid
                    ? adminT("offers.status.active")
                    : offer.is_active
                      ? adminT("offers.status.scheduled")
                      : adminT("offers.status.inactive");
                  return (
                    <tr key={offer.id} className="border-b border-[#F1E8DC] align-top">
                      <td className="px-3 py-4">
                        <p className="font-medium text-[#3D2914]">{name}</p>
                        <p className="mt-1 text-xs text-[#9C8B7A]">
                          {offer.savings_egp.toFixed(0)} EGP {adminT("offers.savedLabel")}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-[#3D2914]">
                          {offer.products.length} {adminT("offers.productsShort")}
                          {offer.addons.length > 0
                            ? ` + ${offer.addons.length} ${adminT("offers.addonsShort")}`
                            : ""}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-[#9C8B7A]">
                          {[
                            ...offer.products.map((p) => productLabel(p, lang)),
                            ...offer.addons.map((a) => a.option_name),
                          ].join(" · ")}
                        </p>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <p className="font-semibold text-[#C45B28]">
                          {offer.offer_price_egp.toFixed(0)} EGP
                        </p>
                        <p className="text-xs text-[#9C8B7A] line-through">
                          {offer.original_total_egp.toFixed(0)} EGP
                        </p>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        {offer.avg_price_per_product_egp != null
                          ? `${offer.avg_price_per_product_egp.toFixed(2)} EGP`
                          : "—"}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-[#7A6654]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {toDatetimeLocal(offer.starts_at).replace("T", " ")}
                        </div>
                        <div className="mt-1">
                          {offer.ends_at
                            ? toDatetimeLocal(offer.ends_at).replace("T", " ")
                            : adminT("offers.noEndDate")}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            offer.is_currently_valid
                              ? "bg-emerald-100 text-emerald-800"
                              : offer.is_active
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-700",
                          )}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" className="min-h-9 px-3 py-2" onClick={() => handleEdit(offer)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-h-9 px-3 py-2"
                            onClick={() => void handleDelete(offer.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
