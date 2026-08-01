/**
 * Google Ads Conversion Tracking
 * Tracks conversion events for Google Ads campaigns
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type GoogleAdsConversionLabel = string;

export type GoogleAdsEventParams = {
  send_to?: string;
  value?: number;
  currency?: string;
  transaction_id?: string;
};

/**
 * Track Google Ads conversion event
 */
export function trackGoogleAdsConversion(
  conversionId: string,
  conversionLabel: GoogleAdsConversionLabel,
  params?: GoogleAdsEventParams,
): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID) return;

  const sendTo = conversionId || process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID;
  
  window.gtag?.("event", "conversion", {
    send_to: `${sendTo}/${conversionLabel}`,
    ...params,
  });
}

/**
 * Track purchase conversion
 */
export function trackAdsPurchase(
  value: number,
  transactionId: string,
  conversionLabel?: string,
): void {
  trackGoogleAdsConversion(
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "",
    conversionLabel || "purchase",
    {
      value,
      currency: "EGP",
      transaction_id: transactionId,
    },
  );
}

/**
 * Track add to cart conversion
 */
export function trackAdsAddToCart(
  value: number,
  conversionLabel?: string,
): void {
  trackGoogleAdsConversion(
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "",
    conversionLabel || "add_to_cart",
    {
      value,
      currency: "EGP",
    },
  );
}

/**
 * Track begin checkout conversion
 */
export function trackAdsBeginCheckout(
  value: number,
  conversionLabel?: string,
): void {
  trackGoogleAdsConversion(
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "",
    conversionLabel || "begin_checkout",
    {
      value,
      currency: "EGP",
    },
  );
}

/**
 * Track lead generation conversion (contact form, WhatsApp)
 */
export function trackAdsLead(conversionLabel?: string): void {
  trackGoogleAdsConversion(
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "",
    conversionLabel || "lead",
    {},
  );
}

/**
 * Track page view conversion
 */
export function trackAdsPageView(conversionLabel?: string): void {
  trackGoogleAdsConversion(
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "",
    conversionLabel || "page_view",
    {},
  );
}

/**
 * Track sign up conversion
 */
export function trackAdsSignUp(conversionLabel?: string): void {
  trackGoogleAdsConversion(
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "",
    conversionLabel || "sign_up",
    {},
  );
}
