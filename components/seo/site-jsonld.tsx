import Script from "next/script";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com";

export function SiteJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Cookie Bite",
    url: APP_URL,
    logo: `${APP_URL}/images/web-logo.png`,
    sameAs: [
      "https://www.instagram.com/cookiebite8/",
      "https://x.com/cookiebite8",
      "https://www.facebook.com/cookiebite8",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "cookie.bite.orders@gmail.com",
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Cookie Bite",
    url: APP_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${APP_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Script
        id="cookie-bite-org-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(organization)}
      </Script>
      <Script
        id="cookie-bite-website-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
      >
        {JSON.stringify(website)}
      </Script>
    </>
  );
}

