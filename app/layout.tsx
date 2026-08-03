import type { Metadata, Viewport } from "next";
import { SiteJsonLd } from "@/components/seo/site-jsonld";
import { SeasonalThemeProvider } from "@/components/providers/seasonal-theme-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { StoreFlagsProvider } from "@/components/providers/store-flags-provider";
import { StoreBusinessSettingsProvider } from "@/components/providers/store-business-settings-provider";
import { StoreShippingZonesProvider } from "@/components/providers/store-shipping-zones-provider";
import { StoreCommerceSettingsProvider } from "@/components/providers/store-commerce-settings-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { getLangFromCookies } from "@/lib/seo/server";
import { cn } from "@/lib/utils";
import { CssRecoveryBootstrap } from "@/components/pwa/css-recovery-bootstrap";
import { PreloadProbe } from "@/components/debug/preload-probe";
import { ClickBlockProbe } from "@/components/debug/click-block-probe";
import { CRITICAL_SHELL_CSS } from "@/lib/pwa/critical-shell-css";
import { getPublicStoreFlags } from "@/lib/store/owner-flags-server";
import { getPublicBusinessSettings } from "@/lib/store/business-settings-server";
import { getPublicShippingZones } from "@/lib/shipping/public-zones-server";
import { getPublicCommerceSettings } from "@/lib/store/commerce-settings-server";
import { SupabaseAuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

/**
 * Storefront: two families only — Arabic + Latin body.
 * Using system fonts as fallback to avoid build issues with localFont.
 * Fonts will be loaded via CSS in production.
 */
const cairo = {
  className: "font-sans",
  style: {
    fontFamily: "Cairo, system-ui, -apple-system, sans-serif",
  },
};

const dmSans = {
  className: "font-sans",
  style: {
    fontFamily: "DM Sans, system-ui, -apple-system, sans-serif",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F5EE" },
    { media: "(prefers-color-scheme: dark)", color: "#F8F5EE" },
  ],
};

function getSafeMetadataBase(): URL {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_BASE_URL,
    "https://cookie-bite.com",
  ];

  for (const candidate of candidates) {
    const raw = candidate?.trim();
    if (!raw) continue;

    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
      return new URL(normalized);
    } catch {
      // try next candidate
    }
  }

  return new URL("https://cookie-bite.com");
}

export const metadata: Metadata = {
  metadataBase: getSafeMetadataBase(),
  title: {
    default: "Cookie Bite Store",
    template: "%s | Cookie Bite",
  },
  description:
    "Order handcrafted cookies and gift boxes in New Cairo. Fresh bakes, same-day support, and premium cookie delivery from Cookie Bite.",
  keywords: [
    "cookie delivery new cairo",
    "best cookies in cairo",
    "cookie gift box egypt",
    "luxury cookies egypt",
    "fresh baked cookies cairo",
    "custom gift box cookies",
    "dessert delivery new cairo",
    "cookie bite egypt",
    "birthday cookie gifts cairo",
    "online cookie shop egypt",
  ],
  authors: [{ name: "Cookie Bite" }],
  creator: "Cookie Bite",
  publisher: "Cookie Bite",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Cookie Bite",
    locale: "en_US",
    alternateLocale: ["ar_EG"],
    title: "Cookie Bite | Fresh Cookies & Gift Boxes in New Cairo",
    description:
      "Shop premium handcrafted cookies and gift boxes in New Cairo. Discover bestsellers, seasonal flavors, and same-day support.",
    images: [
      {
        url: "/images/web-logo.png",
        width: 1200,
        height: 630,
        alt: "Cookie Bite handcrafted cookies and gift boxes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@cookiebite8",
    creator: "@cookiebite8",
    title: "Cookie Bite | Fresh Cookies & Gift Boxes in New Cairo",
    description:
      "Craving premium cookies in New Cairo? Discover Cookie Bite and build your perfect gift box today.",
    images: ["/images/web-logo.png"],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Cookie Bite",
    statusBarStyle: "default",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLangFromCookies();
  console.log("===== LAYOUT START =====");
  console.log("Lang:", lang);
  
  let storeFlags, businessSettings, shippingZones, commerceSettings;
  
  try {
    console.log("Fetching store flags...");
    storeFlags = await getPublicStoreFlags();
    console.log("Store flags fetched:", storeFlags);
  } catch (error) {
    console.error("===== STORE FLAGS FETCH ERROR =====");
    console.error(error);
    console.error((error as Error)?.stack);
    throw error;
  }
  
  try {
    console.log("Fetching business settings...");
    businessSettings = await getPublicBusinessSettings();
    console.log("Business settings fetched:", businessSettings);
  } catch (error) {
    console.error("===== BUSINESS SETTINGS FETCH ERROR =====");
    console.error(error);
    console.error((error as Error)?.stack);
    throw error;
  }
  
  try {
    console.log("Fetching shipping zones...");
    shippingZones = await getPublicShippingZones();
    console.log("Shipping zones fetched:", shippingZones);
  } catch (error) {
    console.error("===== SHIPPING ZONES FETCH ERROR =====");
    console.error(error);
    console.error((error as Error)?.stack);
    throw error;
  }
  
  try {
    console.log("Fetching commerce settings...");
    commerceSettings = await getPublicCommerceSettings();
    console.log("Commerce settings fetched:", commerceSettings);
  } catch (error) {
    console.error("===== COMMERCE SETTINGS FETCH ERROR =====");
    console.error(error);
    console.error((error as Error)?.stack);
    throw error;
  }
  
  const dir = lang === "ar" ? "rtl" : "ltr";
  const fontClass = lang === "ar" ? cairo.className : dmSans.className;
  const fontFamily = lang === "ar" ? cairo.style.fontFamily : dmSans.style.fontFamily;
  return (
    <html
      lang={lang}
      dir={dir}
      data-lang={lang}
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(fontClass, "h-full antialiased")}
      style={{ colorScheme: "light", fontFamily }}
    >
      <head>
        <style
          id="cb-critical-shell"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: CRITICAL_SHELL_CSS }}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <CssRecoveryBootstrap />
        {process.env.NODE_ENV === "development" ? (
          <>
            <PreloadProbe />
            <ClickBlockProbe />
          </>
        ) : null}
        <ThemeProvider>
          <LanguageProvider initialLang={lang}>
            <StoreFlagsProvider initialFlags={storeFlags}>
              <StoreBusinessSettingsProvider initialSettings={businessSettings}>
                <StoreShippingZonesProvider initialZones={shippingZones}>
                  <StoreCommerceSettingsProvider initialSettings={commerceSettings}>
                    <SiteJsonLd />
                    <SeasonalThemeProvider />
                    <ErrorBoundary>
                      <SupabaseAuthProvider>
                        {children}
                      </SupabaseAuthProvider>
                    </ErrorBoundary>
                  </StoreCommerceSettingsProvider>
                </StoreShippingZonesProvider>
              </StoreBusinessSettingsProvider>
            </StoreFlagsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
