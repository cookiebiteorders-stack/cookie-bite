import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/login/",
          "/api/",
          "/*.json$",
          "/checkout/",
          "/cart",
          "/account/",
          "/order-confirmation",
          "/p/",
          "/sign-in",
          "/sign-up",
          "/sso-callback",
          "/verify",
          "/reset",
          "/unsubscribe",
          "/invoices/",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
