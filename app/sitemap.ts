import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/shop", changeFrequency: "daily", priority: 0.95 },
  { path: "/gift-box", changeFrequency: "weekly", priority: 0.9 },
  { path: "/our-cookies", changeFrequency: "weekly", priority: 0.85 },
  { path: "/our-story", changeFrequency: "monthly", priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
  { path: "/help/faq", changeFrequency: "monthly", priority: 0.75 },
  { path: "/help/returns", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/search", changeFrequency: "weekly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return staticRoutes.map((route) => ({
    url: `${APP_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    images:
      route.path === "/"
        ? [
            `${APP_URL}/images/web-logo.png`,
            `${APP_URL}/images/sign-in-side.png`,
            `${APP_URL}/images/sign-up-side.png`,
          ]
        : route.path === "/gift-box"
          ? [`${APP_URL}/images/web-logo.png`]
          : undefined,
  }));
}

