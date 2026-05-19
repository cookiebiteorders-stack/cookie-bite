import { Suspense } from "react";
import type { Metadata } from "next";
import { UnsubscribePageBody } from "@/components/pages/unsubscribe-page-body";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Unsubscribe",
  description: "Manage Cookie Bite marketing email preferences.",
  path: "/unsubscribe",
  noIndex: true,
});

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-cb-cream pb-24 pt-12 dark:bg-background" aria-hidden />
      }
    >
      <UnsubscribePageBody />
    </Suspense>
  );
}
