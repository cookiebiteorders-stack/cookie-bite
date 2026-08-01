import { withSentryConfig } from "@sentry/nextjs";
import path from "node:path";
import type { NextConfig } from "next";
import { assertProductionEnvOrWarn } from "./lib/config/production-lock";

assertProductionEnvOrWarn();

/** إنتاج: CSP صارمة. التطوير: بدون CSP وبدون HSTS حتى لا يمنع Turbopack/React استخدام eval() في المتصفح. */
const PRODUCTION_SECURITY_HEADERS = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net https://*.googletagmanager.com; style-src 'self' 'unsafe-inline' cdn.jsdelivr.net https://fonts.googleapis.com; img-src 'self' data: blob: https://res.cloudinary.com https://cdn.sanity.io https://images.unsplash.com https://*.cdninstagram.com https://*.fbcdn.net https://*.tile.openstreetmap.org https://tile.openstreetmap.org; connect-src 'self' https://api.cloudinary.com https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net; font-src 'self' https://fonts.gstatic.com cdn.jsdelivr.net; frame-src 'self' https://accept.paymob.com https://*.googletagmanager.com; object-src 'none'; base-uri 'self'; form-action 'self';",
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

/** Modern Baseline only — avoids shipping Next polyfill-module to every client (Lighthouse legacy-JS). */
const emptyPolyfillPath = "./lib/build/empty-polyfill.js";
const polyfillModuleAliases: Record<string, string> = {
  "../build/polyfills/polyfill-module": emptyPolyfillPath,
  "next/dist/build/polyfills/polyfill-module": emptyPolyfillPath,
};

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  serverExternalPackages: ["sharp"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "motion/react",
      "date-fns",
      "@tanstack/react-table",
      "recharts",
      "@supabase/supabase-js",
      "react-markdown",
      "rehype-highlight",
      "remark-gfm",
    ],
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: path.resolve(process.cwd()),
    resolveAlias: polyfillModuleAliases,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve ??= {};
      config.resolve.alias = {
        ...config.resolve.alias,
        ...polyfillModuleAliases,
      };
    }
    return config;
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
    deviceSizes: [640, 750, 828, 1080, 1200], // Removed 1920 for better performance on mobile
    imageSizes: [32, 48, 64, 96, 128, 256, 384], // Removed 512 for smaller image variants
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
        hostname: "**.fbcdn.net",
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
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*\\.(jpg|jpeg|png|webp|avif|gif|svg|ico)$",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*\\.(mp4|webm)$",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/api/cart/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      },
      {
        source: "/api/checkout/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      },
      {
        source: "/api/orders/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      },
      {
        source: "/api/account/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        source: "/api/wishlist/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      },
      {
        source: "/api/promo/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0",
          },
        ],
      },
      { source: "/(.*)", headers },
    ];
  },
};

function wrapConfig(config: NextConfig): NextConfig {
  if (process.env.ANALYZE === "true") {
    const withBundleAnalyzer = require("@next/bundle-analyzer")({
      enabled: true,
      openAnalyzer: true,
    });
    return withBundleAnalyzer(config);
  }
  return config;
}

export default withSentryConfig(wrapConfig(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "cookie-bite",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
