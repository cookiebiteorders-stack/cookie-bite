"use client";

import { useState } from "react";
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

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phonePrimary: "",
    phoneSecondary: "",
    address: "",
    city: "",
    governorate: "",
    notes: "",
    deliveryDate: "",
    deliveryTime: "",
  });

  // Location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressHint, setAddressHint] = useState<AddressMapHint | null>(null);

  // Set default delivery date to tomorrow
  useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFormData((prev) => ({
      ...prev,
      deliveryDate: tomorrow.toISOString().split('T')[0],
    }));
  });

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleAddressHint = (hint: AddressMapHint) => {
    setAddressHint(hint);
    setFormData((prev) => ({
      ...prev,
      address: hint.street || prev.address,
      city: hint.city || prev.city,
      governorate: hint.governorate || prev.governorate,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("الاسم مطلوب");
      return;
    }
    if (!formData.phonePrimary.trim()) {
      setError("رقم الهاتف الرئيسي مطلوب");
      return;
    }
    if (!formData.address.trim()) {
      setError("العنوان مطلوب");
      return;
    }
    if (!formData.city.trim()) {
      setError("المدينة مطلوبة");
      return;
    }
    if (!formData.deliveryDate) {
      setError("تاريخ التوصيل مطلوب");
      return;
    }

    // Validate phone format (Egyptian format)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(formData.phonePrimary)) {
      setError("رقم الهاتف الرئيسي غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)");
      return;
    }
    if (formData.phoneSecondary && !phoneRegex.test(formData.phoneSecondary)) {
      setError("رقم الهاتف الثانوي غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)");
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

    // Create checkout details object - filter out empty strings
    const checkoutData: CheckoutDetails = {
      name: formData.name,
      phonePrimary: formData.phonePrimary,
      phoneSecondary: formData.phoneSecondary || undefined,
      address: formData.address,
      city: formData.city,
      governorate: formData.governorate || undefined,
      notes: formData.notes || undefined,
      deliveryDate: formData.deliveryDate,
      deliveryTime: formData.deliveryTime || undefined,
      latitude,
      longitude,
      placeLabel: addressHint?.placeLabel || undefined,
    };

    // Call Paymob checkout directly
    const success = await startCheckout(checkoutData);
    if (!success) {
      console.error("Checkout failed:", checkoutError);
      setError(checkoutError || "حدث خطأ أثناء معالجة الدفع");
      setLoading(false);
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phonePrimary" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    رقم الهاتف الرئيسي <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
                    <input
                      id="phonePrimary"
                      type="tel"
                      value={formData.phonePrimary}
                      onChange={(e) => setFormData({ ...formData, phonePrimary: e.target.value })}
                      placeholder="01xxxxxxxxx"
                      className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 pr-10 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phoneSecondary" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    رقم هاتف إضافي (اختياري)
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
                    <input
                      id="phoneSecondary"
                      type="tel"
                      value={formData.phoneSecondary}
                      onChange={(e) => setFormData({ ...formData, phoneSecondary: e.target.value })}
                      placeholder="01xxxxxxxxx"
                      className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 pr-10 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    />
                  </div>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    المدينة <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="المدينة"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="governorate" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    المحافظة
                  </label>
                  <input
                    id="governorate"
                    type="test"
                    value={formData.governorate}
                    onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                    placeholder="المحافظة"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أي معلومات إضافية قد تساعد في التوصيل..."
                  rows={2}
                  className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none"
                />
              </div>
            </div>
          </section>

          {/* Delivery Date & Time */}
          <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
              <Calendar className="h-5 w-5" />
              موعد التوصيل
            </h2>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  <p className="mt-1 text-xs text-cb-text-muted">
                    التوصيل متاح من الغد
                  </p>
                </div>

                <div>
                  <label htmlFor="deliveryTime" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    وقت التوصيل المفضل
                  </label>
                  <select
                    id="deliveryTime"
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  >
                    <option value="">اختر الوقت</option>
                    <option value="morning">صباحاً (9:00 - 12:00)</option>
                    <option value="midday">ظهراً (12:00 - 3:00)</option>
                    <option value="afternoon">عصراً (3:00 - 6:00)</option>
                    <option value="evening">مساءً (6:00 - 9:00)</option>
                  </select>
                </div>
              </div>
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
