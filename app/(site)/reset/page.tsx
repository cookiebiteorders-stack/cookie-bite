import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPageBody } from "@/components/pages/reset-page-body";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Reset Password",
  description: "Reset your Cookie Bite account password securely.",
  path: "/reset",
  noIndex: true,
});

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] bg-cb-cream pb-24 pt-12 dark:bg-background" aria-hidden />
      }
    >
      <ResetPageBody />
    </Suspense>
  );
}
