import type { Metadata, Viewport } from "next";
import { SiteJsonLd } from "@/components/seo/site-jsonld";
import { SeasonalThemeProvider } from "@/components/providers/seasonal-theme-provider";
import localFont from "next/font/local";
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
import "./globals.css";

/**
 * Storefront: two families only — Arabic + Latin body.
 * Loaded via next/font/local (woff2 from @fontsource) so builds succeed
 * without network access to fonts.googleapis.com.
 */
const cairo = localFont({
  src: [
    { path: "../public/fonts/cairo-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/cairo-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/cairo-arabic-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/cairo-arabic-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-cairo",
  display: "swap",
  preload: false,
});

const dmSans = localFont({
  src: [
    { path: "../public/fonts/dm-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/dm-sans-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F5EE" },
    { media: "(prefers-color-scheme: dark)", color: "#F8F5EE" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com"),
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
  const [storeFlags, businessSettings, shippingZones, commerceSettings] = await Promise.all([
    getPublicStoreFlags(),
    getPublicBusinessSettings(),
    getPublicShippingZones(),
    getPublicCommerceSettings(),
  ]);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const fontClass = lang === "ar" ? cairo.className : dmSans.className;
  const fontVariable = lang === "ar" ? cairo.variable : dmSans.variable;
  return (
    <html
      lang={lang}
      dir={dir}
      data-lang={lang}
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(fontVariable, fontClass, "h-full antialiased")}
      style={{ colorScheme: "light" }}
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
                    <ErrorBoundary>{children}</ErrorBoundary>
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
