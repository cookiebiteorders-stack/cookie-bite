import { Suspense } from "react";
import type { Metadata } from "next";
import { VerifyPageBody } from "@/components/pages/verify-page-body";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Verify Email",
  description: "Confirm your Cookie Bite account email address.",
  path: "/verify",
  noIndex: true,
});

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-cb-cream pb-24 pt-12 dark:bg-background" aria-hidden />
      }
    >
      <VerifyPageBody />
    </Suspense>
  );
}
