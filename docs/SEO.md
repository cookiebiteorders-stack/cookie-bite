# SEO & Search Console

## Environment

Set in production `.env`:

```bash
NEXT_PUBLIC_APP_URL=https://cookie-bite.com
GOOGLE_SITE_VERIFICATION=<meta tag content from Search Console>
```

`GOOGLE_SITE_VERIFICATION` is wired in [`app/layout.tsx`](../app/layout.tsx) via Next.js `metadata.verification.google`.

## After deploy

1. Open [Google Search Console](https://search.google.com/search-console) and add the property `https://cookie-bite.com`.
2. Choose **HTML tag** verification and paste the content value into `GOOGLE_SITE_VERIFICATION`.
3. Redeploy, then click **Verify** in Search Console.
4. Submit sitemap: `https://cookie-bite.com/sitemap.xml`
5. Monitor **Pages**, **Enhancements** (Product, FAQ, Breadcrumbs), and **Core Web Vitals**.

## Sanity blog seed titles

Create published posts in Sanity Studio matching slugs in [`lib/sanity/queries.ts`](../lib/sanity/queries.ts) (`BLOG_SEED_TITLES`).

## Dynamic sitemap

[`app/sitemap.ts`](../app/sitemap.ts) includes static pages, `/collections/*`, active product slugs (Supabase), and published blog posts (Sanity).
