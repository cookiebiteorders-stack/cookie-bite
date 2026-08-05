"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Phone, User, Calendar, Clock, ArrowRight } from "lucide-react";
import { AddressMapPicker, type AddressMapHint } from "@/components/account/address-map-picker";
import { buttonClassName } from "@/components/ui/button";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { usePaymobCheckout, type CheckoutDetails } from "@/hooks/use-paymob-checkout";
import { cn } from "@/lib/utils";

export default function CheckoutDetailsPage() {
  const { t, formatPrice } = useLanguage();
  const { lines, subtotalEgp, itemCount } = useCart();
  const { startCheckout, isLoading: checkoutLoading, error: checkoutError } = usePaymobCheckout();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - simplified for faster checkout
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    area: "",
    deliveryDate: "",
  });

  // Location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressHint, setAddressHint] = useState<AddressMapHint | null>(null);

  // Set default delivery date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData((prev) => ({
      ...prev,
      deliveryDate: tomorrow.toISOString().split("T")[0],
    }));
  }, []);

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleAddressHint = (hint: AddressMapHint) => {
    setAddressHint(hint);
    setFormData((prev) => ({
      ...prev,
      address: hint.street || prev.address,
      area: hint.city || prev.area,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation - simplified
    if (!formData.name.trim()) {
      setError("الاسم مطلوب");
      return;
    }
    if (!formData.phone.trim()) {
      setError("رقم الهاتف مطلوب");
      return;
    }
    if (!formData.address.trim()) {
      setError("العنوان مطلوب");
      return;
    }
    if (!formData.area.trim()) {
      setError("المنطقة مطلوبة");
      return;
    }
    if (!formData.deliveryDate) {
      setError("تاريخ التوصيل مطلوب");
      return;
    }

    // Validate phone format (Egyptian format)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)");
      return;
    }

    // Validate delivery date is not today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.deliveryDate);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate.getTime() <= today.getTime()) {
      setError("يجب أن يكون تاريخ التوصيل غداً أو بعد");
      return;
    }

    setLoading(true);

    // Create checkout details object - simplified
    const checkoutData: CheckoutDetails = {
      name: formData.name,
      phonePrimary: formData.phone,
      phoneSecondary: undefined,
      address: formData.address,
      city: formData.area,
      governorate: undefined,
      notes: undefined,
      deliveryDate: formData.deliveryDate,
      deliveryTime: undefined,
      latitude,
      longitude,
      placeLabel: addressHint?.placeLabel || undefined,
    };

    // Call Paymob checkout directly
    const success = await startCheckout(checkoutData);
    setLoading(false);
    if (!success) {
      console.error("Checkout failed:", checkoutError);
      setError(checkoutError || "حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.");
    } else {
      // Success - redirect happens automatically in startCheckout
    }
  };

  if (lines.length === 0) {
    return (
      <div className="bg-cb-cream pb-24 pt-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-3xl border border-cb-border bg-cb-surface p-10 text-center">
            <h1 className="font-serif text-2xl font-semibold text-cb-text-strong">
              {t("pages.cart.empty")}
            </h1>
            <a
              href="/shop"
              className={buttonClassName("primary", "mt-6 inline-flex rounded-full px-8")}
            >
              {t("pages.cart.shopCookies")}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="font-serif text-3xl font-semibold text-cb-text-strong">
          تفاصيل التوصيل
        </h1>
        <p className="mt-2 text-cb-text-muted">
          يرجى إدخال بيانات التوصيل لإتمام الطلب
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Contact Information */}
          <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
              <User className="h-5 w-5" />
              معلومات التواصل
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                  الاسم الكامل <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسمك الكامل"
                  className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                  رقم الهاتف <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 pr-10 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Address with GPS */}
          <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
              <MapPin className="h-5 w-5" />
              عنوان التوصيل
            </h2>

            <div className="space-y-4">
              <AddressMapPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleLocationChange}
                onAddressHint={handleAddressHint}
              />

              <div>
                <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                  العنوان بالتفصيل <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="اسم الشارع، رقم المبنى، رقم الشقة، الطابق..."
                  rows={3}
                  className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none"
                  required
                />
              </div>

              <div>
                <label htmlFor="area" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                  المنطقة <span className="text-red-500">*</span>
                </label>
                <input
                  id="area"
                  type="text"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="المنطقة (مثال: التجمع الخامس، مدينة نصر)"
                  className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  required
                />
              </div>
            </div>
          </section>

          {/* Delivery Date */}
          <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
              <Calendar className="h-5 w-5" />
              موعد التوصيل
            </h2>

            <div>
              <label htmlFor="deliveryDate" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                تاريخ التوصيل <span className="text-red-500">*</span>
              </label>
              <input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                required
              />
              <p className="mt-2 text-xs text-cb-text-muted">
                التوصيل متاح من الغد - التوصيل في نفس اليوم متاح للطلبات قبل 2 ظهراً
              </p>
            </div>
          </section>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/25">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              buttonClassName("primary", "inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-lg"),
              "disabled:opacity-50"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                المتابعة للدفع
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
