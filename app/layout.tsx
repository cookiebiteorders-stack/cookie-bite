import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ClerkProvider } from "@clerk/nextjs";
import { getClerkLocalization } from "@/lib/auth/clerk-auth-localization";
import { SiteJsonLd } from "@/components/seo/site-jsonld";
import { GA4Tracker } from "@/components/analytics/ga4-tracker";
import { Cairo, DM_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { StoreFlagsProvider } from "@/components/providers/store-flags-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { LokiSvgFilters } from "@/components/effects/loki-svg-filters";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import { cn } from "@/lib/utils";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import {
  resolveClerkJsScriptUrl,
  resolveClerkUIScriptUrl,
} from "@/lib/auth/clerk-js-fallback";
import { CssRecoveryBootstrap } from "@/components/pwa/css-recovery-bootstrap";
import { CRITICAL_SHELL_CSS } from "@/lib/pwa/critical-shell-css";
import "./globals.css";

const clerkJsScriptUrl = resolveClerkJsScriptUrl();
const clerkUIScriptUrl = resolveClerkUIScriptUrl();

/** Storefront: two families only — Arabic + Latin body (display uses system serif via tokens). */
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["latin", "arabic"],
  weight: ["400", "600"],
  display: "swap",
  preload: true,
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
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
  const store = await cookies();
  const lang = store.get(LANG_COOKIE)?.value === "en" ? "en" : "ar";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const clerkLocalization = getClerkLocalization(lang);
  return (
    <html
      lang={lang}
      dir={dir}
      data-lang={lang}
      data-theme="light"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(cairo.variable, dmSans.variable, "h-full antialiased")}
      style={{ colorScheme: "light" }}
    >
      <head>
        {/* Inline shell rules — survive main CSS load failures (PWA stale cache, static 503). */}
        <style id="cb-critical-shell" dangerouslySetInnerHTML={{ __html: CRITICAL_SHELL_CSS }} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://clerk.cookie-bite.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
      </head>
      <body className="min-h-full bg-background font-sans text-foreground">
        <CssRecoveryBootstrap />
        <LokiSvgFilters />
        <ClerkProvider
          {...(clerkJsScriptUrl
            ? { __internal_clerkJSUrl: clerkJsScriptUrl }
            : {})}
          {...(clerkUIScriptUrl
            ? { __internal_clerkUIUrl: clerkUIScriptUrl }
            : {})}
          localization={clerkLocalization}
          appearance={{
            ...clerkAuthAppearance,
            layout: {
              ...clerkAuthAppearance.layout,
              unsafe_disableDevelopmentModeWarnings: true,
            },
          }}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          afterSignOutUrl="/"
          signInFallbackRedirectUrl="/account"
          signUpFallbackRedirectUrl="/account"
        >
          <ThemeProvider>
            <LanguageProvider initialLang={lang}>
              <StoreFlagsProvider>
                <SiteJsonLd />
                <GA4Tracker />
                <ErrorBoundary>{children}</ErrorBoundary>
              </StoreFlagsProvider>
            </LanguageProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
