import path from "node:path";
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";
import { resolveClerkJsUrlForNextEnv } from "./lib/auth/clerk-js-fallback";
import { assertProductionEnvOrWarn } from "./lib/config/production-lock";

assertProductionEnvOrWarn();

type PwaWrap = (config: NextConfig) => NextConfig;
type PwaFactory = (options: Record<string, unknown>) => PwaWrap;

function resolvePwaFactory(): PwaFactory {
  const mod = withPWAInit as PwaFactory | { default: PwaFactory };
  const factory = typeof mod === "function" ? mod : mod.default;
  if (typeof factory !== "function") {
    throw new TypeError("next-pwa: expected a factory function export");
  }
  return factory;
}

const withPWA = resolvePwaFactory()({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    // Hashed files are immutable — CacheFirst avoids blank/broken pages when the network
    // is slow and NetworkFirst would miss CSS after a deploy (symptom: giant LogoMark, no layout).
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static-immutable",
        expiration: { maxEntries: 256, maxAgeSeconds: 365 * 24 * 60 * 60 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    {
      urlPattern: /^\/_next\/image\?url=.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image-optimizer",
        expiration: { maxEntries: 240, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "cloudinary-images",
        expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "unsplash-images",
        expiration: { maxEntries: 120, maxAgeSeconds: 14 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/cdn\.sanity\.io\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "sanity-images",
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\/api\/products.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-products",
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
      },
    },
  ],
});

/** إنتاج: CSP صارمة. التطوير: بدون CSP وبدون HSTS حتى لا يمنع Turbopack/React استخدام eval() في المتصفح. */
const PRODUCTION_SECURITY_HEADERS = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com https://clerk.cookie-bite.com https://*.clerk.accounts.dev https://*.clerk.com https://*.clerk.dev https://*.googletagmanager.com; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net cdnjs.cloudflare.com https://fonts.googleapis.com; img-src 'self' data: blob: https://res.cloudinary.com https://cdn.sanity.io https://images.unsplash.com https://img.clerk.com https://images.clerk.dev https://*.tile.openstreetmap.org https://tile.openstreetmap.org; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://clerk.cookie-bite.com wss://clerk.cookie-bite.com https://*.clerk.accounts.dev wss://*.clerk.accounts.dev https://*.clerk.com wss://*.clerk.com https://*.clerk.dev wss://*.clerk.dev; font-src 'self' https://fonts.gstatic.com cdn.jsdelivr.net;",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=(self), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const DEVELOPMENT_BASIC_HEADERS = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  /** في التطوير: CDN لـ clerk-js إذا لم يُضبط NEXT_PUBLIC_CLERK_JS_URL (انظر clerk-js-fallback.ts) */
  env: {
    NEXT_PUBLIC_CLERK_JS_URL: resolveClerkJsUrlForNextEnv(),
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async redirects() {
    return [
      { source: "/gift-ideas", destination: "/gift-box", permanent: true },
      { source: "/admin/design-library", destination: "/admin/template-library", permanent: false },
    ];
  },
  async rewrites() {
    const pythonBase = process.env.PYTHON_API_URL?.trim().replace(/\/$/, "");
    if (!pythonBase) return [];
    return [
      {
        source: "/api/python/:path*",
        destination: `${pythonBase}/:path*`,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    const headers =
      process.env.NODE_ENV === "development"
        ? DEVELOPMENT_BASIC_HEADERS
        : PRODUCTION_SECURITY_HEADERS;
    return [
      {
        source: "/:path*\\.(jpg|jpeg|png|webp|avif|gif|svg|ico)$",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      { source: "/(.*)", headers },
    ];
  },
};

export default withPWA(nextConfig);
