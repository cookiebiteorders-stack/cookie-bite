"use client";

import { useState, useEffect } from "react";
import { redirect, useSearchParams } from "next/navigation";
import { Loader2, MapPin, Phone, User, CreditCard, Truck, Lock, ArrowRight, Info, Calendar } from "lucide-react";
import { AddressMapPicker, type AddressMapHint } from "@/components/account/address-map-picker";
import { buttonClassName } from "@/components/ui/button";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { usePaymobCheckout, type CheckoutDetails } from "@/hooks/use-paymob-checkout";
import { useFreeShippingThreshold } from "@/components/providers/store-commerce-settings-provider";
import { cn } from "@/lib/utils";
import type { AbandonedCartSnapshot } from "@/lib/cart/abandoned";
import type { CartLine } from "@/lib/cart/types";

export default function CheckoutPageClient() {
  const { t, formatPrice } = useLanguage();
  const { lines, subtotalEgp, discountEgp, itemCount, promo, applyPromo, clearPromo, restoreCart } = useCart();
  const { startCheckout, isLoading: checkoutLoading, error: checkoutError } = usePaymobCheckout();
  const freeShippingThreshold = useFreeShippingThreshold();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch CSRF token from API on mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await fetch("/api/csrf");
        if (res.ok) {
          const data = await res.json();
          setCsrfToken(data.token);
          console.log("CSRF token fetched:", data.token);
        } else {
          console.error("Failed to fetch CSRF token");
          setCsrfToken("fallback-" + Date.now().toString(36));
        }
      } catch (err) {
        console.error("Error fetching CSRF token:", err);
        setCsrfToken("fallback-" + Date.now().toString(36));
      }
    };
    fetchCsrfToken();
  }, []);

  // Handle cart recovery from abandoned cart email
  useEffect(() => {
    const recoverToken = searchParams.get("recover");
    if (!recoverToken) return;

    const recoverCart = async () => {
      setRecovering(true);
      try {
        const res = await fetch(`/api/cart/recover/${encodeURIComponent(recoverToken)}`, {
          method: "POST",
        });
        if (!res.ok) {
          console.error("Failed to recover cart");
          return;
        }
        const data = await res.json();
        const lines = (data.cartSnapshot?.lines ?? []) as CartLine[];
        const discountCode = data.discountCode as string | null;
        await restoreCart(lines, discountCode);
      } catch (err) {
        console.error("Error recovering cart:", err);
      } finally {
        setRecovering(false);
      }
    };

    recoverCart();
  }, [searchParams, restoreCart]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    area: "",
    governorate: "",
    notes: "",
    deliveryDate: "",
    paymentMethod: "card" as "card" | "wallet" | "cash_on_delivery",
    shippingMethod: "standard" as string,
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

    // Validation
    if (!formData.name.trim()) {
      setError("الاسم مطلوب - يرجى إدخال الاسم الكامل");
      return;
    }
    if (!formData.phone.trim()) {
      setError("رقم الهاتف مطلوب - يرجى إدخال رقم هاتف صحيح");
      return;
    }
    if (!formData.address.trim()) {
      setError("العنوان مطلوب - يرجى إدخال العنوان الكامل");
      return;
    }
    if (formData.address.trim().length < 3) {
      setError("العنوان قصير جداً - يجب أن يحتوي على 3 أحرف على الأقل");
      return;
    }
    if (!formData.area.trim()) {
      setError("المنطقة/المدينة مطلوبة - يرجى إدخال اسم المنطقة");
      return;
    }
    if (!formData.deliveryDate) {
      setError("تاريخ التوصيل مطلوب - يرجى اختيار تاريخ التوصيل");
      return;
    }

    // Validate phone format (Egyptian format)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("رقم الهاتف غير صحيح - يجب أن يبدأ بـ 01 ويتكون من 11 رقم (مثال: 01234567890)");
      return;
    }

    // Validate delivery date is not today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(formData.deliveryDate);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate.getTime() <= today.getTime()) {
      setError("تاريخ التوصيل غير صحيح - يجب أن يكون غداً أو بعد (التوصيل في نفس اليوم غير متاح)");
      return;
    }

    setLoading(true);

    // Create checkout details object
    const checkoutData: CheckoutDetails = {
      name: formData.name,
      phonePrimary: formData.phone,
      phoneSecondary: undefined,
      address: formData.address,
      city: formData.area,
      governorate: formData.governorate || undefined,
      notes: formData.notes || undefined,
      deliveryDate: formData.deliveryDate,
      deliveryTime: undefined,
      latitude,
      longitude,
      placeLabel: addressHint?.placeLabel || undefined,
    };

    // Debug: Check CSRF token
    console.log("CSRF token before checkout:", csrfToken);
    if (!csrfToken) {
      setError("CSRF token not loaded. Please refresh the page and try again.");
      setLoading(false);
      return;
    }

    // Call checkout with selected payment method
    const success = await startCheckout(checkoutData, formData.paymentMethod, csrfToken);
    setLoading(false);
    if (!success) {
      console.error("Checkout failed:", checkoutError);
      setError(checkoutError || "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.");
    }
  };

  if (lines.length === 0) {
    return (
      <div className="bg-cb-cream pb-24 pt-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-3xl border border-cb-border bg-cb-surface p-10 text-center">
            {recovering ? (
              <>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-cb-terracotta-dark" />
                <h1 className="mt-4 font-serif text-2xl font-semibold text-cb-text-strong">
                  Restoring your cart...
                </h1>
              </>
            ) : (
              <>
                <h1 className="font-serif text-2xl font-semibold text-cb-text-strong">
                  {t("pages.cart.empty")}
                </h1>
                <a
                  href="/shop"
                  className={buttonClassName("primary", "mt-6 inline-flex rounded-full px-8")}
                >
                  {t("pages.cart.shopCookies")}
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const shipping = subtotalEgp >= freeShippingThreshold ? 0 : 50;
  const total = Math.max(0, subtotalEgp - discountEgp + shipping);

  return (
    <div className="bg-cb-cream pb-24 pt-10">
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="font-serif text-3xl font-semibold text-cb-text-strong">
          Checkout
        </h1>
        <p className="mt-2 text-cb-text-muted">
          Complete your order details
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          {/* Left Column - Forms */}
          <div className="space-y-6">
            {/* Customer Information */}
            <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
                <User className="h-5 w-5" />
                Customer Information
              </h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="الاسم الكامل (مثال: أحمد محمد)"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cb-text-muted" />
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="01xxxxxxxxx (مثال: 01234567890)"
                      className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 pr-10 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    Email (Optional)
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>
            </section>

            {/* Shipping Address */}
            <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
                <MapPin className="h-5 w-5" />
                Shipping Address
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
                    Full Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="العنوان الكامل (الشارع، المبنى، الدور، الشقة - مثال: شارع المعرفة، مبنى 5، الدور الثالث، شقة 12)"
                    rows={3}
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="area" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    Area/City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="area"
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="المنطقة/المدينة (مثال: مدينة نصر، المعادي، وسط البلد)"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="governorate" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    Governorate
                  </label>
                  <input
                    id="governorate"
                    type="text"
                    value={formData.governorate}
                    onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                    placeholder="المحافظة (مثال: القاهرة، الجيزة، الإسكندرية)"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>

                <div>
                  <label htmlFor="deliveryDate" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-cb-text-strong">
                    <Calendar className="h-4 w-4" />
                    Delivery Date <span className="text-red-500">*</span>
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
                  <p className="mt-1 text-xs text-cb-text-muted">التوصيل في نفس اليوم غير متاح - يجب اختيار غداً أو بعد</p>
                </div>
              </div>
            </section>

            {/* Shipping Method */}
            <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
                <Truck className="h-5 w-5" />
                Shipping Method
              </h2>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cb-border bg-cb-surface-2 p-4 hover:border-amber-400">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="standard"
                    checked={formData.shippingMethod === "standard"}
                    onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value as any })}
                    className="h-4 w-4 text-amber-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-cb-text-strong">Standard Delivery</p>
                    <p className="text-sm text-cb-text-muted">3-5 business days</p>
                  </div>
                  <span className="font-semibold text-cb-text-strong">
                    {shipping === 0 ? "Free" : formatPrice(shipping)}
                  </span>
                </label>
              </div>
            </section>

            {/* Payment Method */}
            <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-cb-text-strong">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </h2>

              <div className="space-y-3">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cb-border bg-cb-surface-2 p-4 hover:border-amber-400">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === "card"}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="h-4 w-4 text-amber-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-cb-text-strong">Paymob (Card/Wallet)</p>
                    <p className="text-sm text-cb-text-muted">Secure online payment</p>
                  </div>
                  <Lock className="h-4 w-4 text-cb-text-muted" />
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-cb-border bg-cb-surface-2 p-4 hover:border-amber-400">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash_on_delivery"
                    checked={formData.paymentMethod === "cash_on_delivery"}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="h-4 w-4 text-amber-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-cb-text-strong">Cash on Delivery</p>
                    <p className="text-sm text-cb-text-muted">Pay when you receive your order</p>
                  </div>
                </label>
              </div>
            </section>

            {/* Delivery Notes */}
            <section className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="mb-4 font-semibold text-cb-text-strong">
                Delivery Notes (Optional) - ملاحظات التوصيل (اختياري)
              </h2>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أي تعليمات خاصة للتوصيل (مثال: اتصل بي عند الوصول، الشقة بجانب المصعد، إلخ)"
                rows={3}
                className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </section>
          </div>

          {/* Right Column - Instructions & Order Summary */}
          <div className="lg:sticky lg:top-24 space-y-6">
            {/* Instructions Box */}
            <div className="rounded-3xl border-2 border-amber-400 bg-amber-50 p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-amber-900">
                <Info className="h-5 w-5" />
                Important Instructions
              </h2>
              <div className="space-y-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-5 w-5 rounded-full bg-amber-200 text-center text-xs font-bold leading-5">1</span>
                  <div>
                    <p className="font-semibold">Phone Number Format</p>
                    <p className="text-xs">Must be 11 digits starting with 01</p>
                    <p className="mt-1 rounded bg-amber-100 px-2 py-1 font-mono text-xs">01xxxxxxxxx</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-5 w-5 rounded-full bg-amber-200 text-center text-xs font-bold leading-5">2</span>
                  <div>
                    <p className="font-semibold">Address Details</p>
                    <p className="text-xs">Enter full address (minimum 3 characters)</p>
                    <p className="text-xs">Include street, building, floor, apartment</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-5 w-5 rounded-full bg-amber-200 text-center text-xs font-bold leading-5">3</span>
                  <div>
                    <p className="font-semibold">City & Governorate</p>
                    <p className="text-xs">Enter your area/city and governorate</p>
                    <p className="text-xs">Example: Nasr City, Cairo</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-5 w-5 rounded-full bg-amber-200 text-center text-xs font-bold leading-5">4</span>
                  <div>
                    <p className="font-semibold">Delivery Date</p>
                    <p className="text-xs">Must be tomorrow or later</p>
                    <p className="text-xs">Same-day delivery not available</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-5 w-5 rounded-full bg-amber-200 text-center text-xs font-bold leading-5">5</span>
                  <div>
                    <p className="font-semibold">Payment Methods</p>
                    <p className="text-xs">Card/Wallet: Secure online payment</p>
                    <p className="text-xs">Cash on Delivery: Pay when you receive</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-3xl border border-cb-border bg-cb-surface p-6">
              <h2 className="text-lg font-semibold text-cb-text-strong">Order Summary</h2>
              
              <div className="mt-4 space-y-3">
                {lines.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cb-peach/40">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-cb-text-strong">{item.name}</p>
                      <p className="text-sm text-cb-text-muted">Qty: {item.quantity}</p>
                      <p className="font-semibold text-cb-text-strong">
                        {formatPrice(item.finalUnitPriceEgp * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center justify-between text-cb-text-muted">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotalEgp)}</span>
                </div>
                {discountEgp > 0 && (
                  <div className="flex items-center justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>−{formatPrice(discountEgp)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-cb-text-muted">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-cb-border pt-3 text-base font-bold text-cb-text-strong">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || checkoutLoading}
                className={buttonClassName(
                  "primary",
                  "mt-6 w-full rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                )}
              >
                {loading || checkoutLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Confirm Order
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="mt-3 text-center text-xs text-cb-text-muted">
                <Lock className="inline h-3 w-3" /> Secure checkout powered by Paymob
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
