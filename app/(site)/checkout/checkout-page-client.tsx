"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, MapPin, Phone, User, CreditCard, Truck, Lock, ArrowRight, Info, Calendar } from "lucide-react";
import { AddressMapPicker, type AddressMapHint } from "@/components/account/address-map-picker";
import { buttonClassName } from "@/components/ui/button";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { usePaymobCheckout, type CheckoutDetails } from "@/hooks/use-paymob-checkout";
import { useFreeShippingThreshold } from "@/components/providers/store-commerce-settings-provider";
import type { CartLine } from "@/lib/cart/types";
import { EGYPT_GOVERNORATES, EGYPT_CITIES_BY_GOVERNORATE } from "@/lib/data/egyptLocations";
import { matchGovernorate, matchCity, getAutoDetectMessage } from "@/lib/data/nominatimMapping";

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
    let isMounted = true;
    
    const fetchCsrfToken = async () => {
      try {
        const res = await fetch("/api/csrf");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setCsrfToken(data.token);
        } else {
          if (isMounted) setCsrfToken("fallback-" + Date.now().toString(36));
        }
      } catch (err) {
        if (isMounted) setCsrfToken("fallback-" + Date.now().toString(36));
      }
    };
    fetchCsrfToken();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle cart recovery from abandoned cart email
  useEffect(() => {
    let isMounted = true;
    
    const recoverToken = searchParams.get("recover");
    if (!recoverToken) return;

    const recoverCart = async () => {
      if (isMounted) setRecovering(true);
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
        if (isMounted) setRecovering(false);
      }
    };

    recoverCart();

    return () => {
      isMounted = false;
    };
  }, [searchParams, restoreCart]);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    area: "",
    customArea: "", // For when user selects "أخرى" for area
    governorate: "",
    customGovernorate: "", // For when user selects "أخرى" for governorate
    notes: "",
    deliveryDate: "",
    paymentMethod: "card" as "card" | "wallet" | "cash_on_delivery",
    shippingMethod: "standard" as string,
  });

  // Location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [addressHint, setAddressHint] = useState<AddressMapHint | null>(null);
  const [autoDetectMessage, setAutoDetectMessage] = useState<string | null>(null);
  
  // Delivery fee state
  const [deliveryFee, setDeliveryFee] = useState<number>(50);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);

  // Set default delivery date to tomorrow
  const defaultDeliveryDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  // Calculate minimum delivery date for the date input
  const minDeliveryDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      deliveryDate: defaultDeliveryDate,
    }));
  }, [defaultDeliveryDate]);

  // Fetch delivery fee based on city/governorate
  useEffect(() => {
    let isMounted = true;
    
    const fetchDeliveryFee = async () => {
      const location = formData.governorate || formData.area;
      if (!location) {
        if (isMounted) setDeliveryFee(50); // Default fee
        return;
      }

      if (isMounted) setDeliveryFeeLoading(true);
      try {
        const params = new URLSearchParams();
        // Use custom values if "أخرى" is selected, otherwise use the selected values
        const govValue = formData.governorate === "أخرى" ? formData.customGovernorate : formData.governorate;
        const areaValue = formData.area === "أخرى" ? formData.customArea : formData.area;
        
        if (govValue) {
          params.set("governorate", govValue);
        } else if (areaValue) {
          params.set("city", areaValue);
        }

        const res = await fetch(`/api/shipping/fee?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setDeliveryFee(data.fee);
        } else {
          if (isMounted) setDeliveryFee(50); // Fallback to default
        }
      } catch (err) {
        console.error("Failed to fetch delivery fee:", err);
        if (isMounted) setDeliveryFee(50); // Fallback to default
      } finally {
        if (isMounted) setDeliveryFeeLoading(false);
      }
    };

    fetchDeliveryFee();

    return () => {
      isMounted = false;
    };
  }, [formData.governorate, formData.area, formData.customGovernorate, formData.customArea]);

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleAddressHint = (hint: AddressMapHint) => {
    setAddressHint(hint);
    
    // Match governorate and city using the mapping system
    const matchedGovernorate = hint.governorate ? matchGovernorate(hint.governorate) : null;
    const matchedCity = hint.city ? matchCity(hint.city, hint.governorate || undefined) : null;
    
    // Show message if auto-detection didn't find exact matches
    if (!matchedGovernorate || !matchedCity) {
      setAutoDetectMessage(getAutoDetectMessage());
    } else {
      setAutoDetectMessage(null);
    }
    
    setFormData((prev) => ({
      ...prev,
      address: hint.street || prev.address,
      governorate: matchedGovernorate || prev.governorate,
      area: matchedCity || prev.area,
    }));
  };

  const handleGovernorateChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      governorate: value,
      area: "", // Reset area when governorate changes
      customArea: "", // Reset custom area when governorate changes
      customGovernorate: value === "أخرى" ? prev.customGovernorate : "", // Clear custom governorate unless "أخرى" is selected
    }));
    setAutoDetectMessage(null); // Clear auto-detect message when user manually selects
  };

  const handleAreaChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      area: value,
      customArea: value === "أخرى" ? prev.customArea : "", // Clear custom area unless "أخرى" is selected
    }));
    setAutoDetectMessage(null); // Clear auto-detect message when user manually selects
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
    if (!formData.email.trim()) {
      setError("البريد الإلكتروني مطلوب - يرجى إدخال بريد إلكتروني صحيح");
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
    if (!formData.governorate.trim()) {
      setError("المحافظة مطلوبة - يرجى اختيار المحافظة من القائمة");
      return;
    }
    if (formData.governorate === "أخرى" && !formData.customGovernorate.trim()) {
      setError("يرجى كتابة اسم المحافظة المطلوبة في الحقل المخصص");
      return;
    }
    // Area is only required if governorate is not "أخرى"
    if (formData.governorate !== "أخرى" && !formData.area.trim()) {
      setError("المنطقة/المدينة مطلوبة - يرجى اختيار المنطقة من القائمة");
      return;
    }
    // If area is "أخرى", custom area is required
    if (formData.area === "أخرى" && !formData.customArea.trim()) {
      setError("يرجى كتابة اسم المنطقة المطلوبة في الحقل المخصص");
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("البريد الإلكتروني غير صحيح - يرجى إدخال بريد إلكتروني صحيح");
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
    const finalCity = formData.area === "أخرى" ? formData.customArea : formData.area;
    const finalGovernorate = formData.governorate === "أخرى" ? formData.customGovernorate : formData.governorate;
    
    const checkoutData: CheckoutDetails = {
      name: formData.name,
      phonePrimary: formData.phone,
      phoneSecondary: undefined,
      address: formData.address,
      city: finalCity || "غير محدد", // Fallback to ensure city is always a string
      governorate: finalGovernorate || undefined,
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
                <Link
                  href="/shop"
                  className={buttonClassName("primary", "mt-6 inline-flex rounded-full px-8")}
                >
                  {t("pages.cart.shopCookies")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const shipping = subtotalEgp >= freeShippingThreshold ? 0 : deliveryFee;
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
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    required
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

                {autoDetectMessage && (
                  <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    {autoDetectMessage}
                  </div>
                )}

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
                  <label htmlFor="governorate" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                    Governorate <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="governorate"
                    value={formData.governorate}
                    onChange={(e) => handleGovernorateChange(e.target.value)}
                    className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    required
                  >
                    <option value="">اختر المحافظة</option>
                    {EGYPT_GOVERNORATES.map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>

                {formData.governorate === "أخرى" && (
                  <div>
                    <label htmlFor="customGovernorate" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                      اسم المحافظة المطلوبة <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="customGovernorate"
                      type="text"
                      value={formData.customGovernorate}
                      onChange={(e) => setFormData({ ...formData, customGovernorate: e.target.value })}
                      placeholder="اكتب اسم المحافظة بالتفصيل"
                      className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      required
                    />
                  </div>
                )}

                {formData.governorate && formData.governorate !== "أخرى" && (
                  <div>
                    <label htmlFor="area" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                      Area/City <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="area"
                      value={formData.area}
                      onChange={(e) => handleAreaChange(e.target.value)}
                      className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      required
                    >
                      <option value="">اختر المنطقة/المدينة</option>
                      {EGYPT_CITIES_BY_GOVERNORATE[formData.governorate]?.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.area === "أخرى" && (
                  <div>
                    <label htmlFor="customArea" className="mb-1.5 block text-sm font-medium text-cb-text-strong">
                      اسم المنطقة المطلوبة <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="customArea"
                      type="text"
                      value={formData.customArea}
                      onChange={(e) => setFormData({ ...formData, customArea: e.target.value })}
                      placeholder="اكتب اسم المنطقة/المدينة بالتفصيل"
                      className="w-full rounded-xl border border-cb-border bg-cb-surface-2 px-4 py-3 text-sm text-cb-text-strong outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      required
                    />
                  </div>
                )}

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
                    min={minDeliveryDate}
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
                    onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                    className="h-4 w-4 text-amber-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-cb-text-strong">Standard Delivery</p>
                    <p className="text-sm text-cb-text-muted">3-5 business days</p>
                  </div>
                  <span className="font-semibold text-cb-text-strong">
                    {deliveryFeeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : shipping === 0 ? (
                      "Free"
                    ) : (
                      formatPrice(shipping)
                    )}
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
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as "card" | "wallet" | "cash_on_delivery" })}
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
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as "card" | "wallet" | "cash_on_delivery" })}
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
                  <span className="mt-1 h-5 w-5 rounded-full bg-amber-200 text-center text-xs font-bold leading-5">1.5</span>
                  <div>
                    <p className="font-semibold">Email Address</p>
                    <p className="text-xs">Valid email address is required</p>
                    <p className="text-xs">Example: your@email.com</p>
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
                    <p className="font-semibold">Governorate & Area/City</p>
                    <p className="text-xs">Select governorate first, then area/city</p>
                    <p className="text-xs">Both fields are required</p>
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
