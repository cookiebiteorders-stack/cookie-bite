"use client";

import Script from "next/script";

type JsonLdScriptProps = {
  id: string;
  /** نص JSON جاهز (مثلاً من JSON.stringify أو دوال SEO) */
  json: string;
};

/**
 * JSON-LD عبر next/script + afterInteractive: لا يُصدَر وسم script في شجرة React (يتوافق مع تحذير React 19).
 */
export function JsonLdScript({ id, json }: JsonLdScriptProps) {
  return (
    <Script id={id} type="application/ld+json" strategy="afterInteractive">
      {json}
    </Script>
  );
}
