"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UtilityPageShell } from "@/components/pages/utility-page-shell";

export function ResetPageBody() {
  const searchParams = useSearchParams();
  const hasToken = Boolean(searchParams.get("token")?.trim());

  return (
    <UtilityPageShell
      eyebrow="Account security"
      title="Reset your password"
      subtitle={
        hasToken
          ? "Use the sign-in page to complete your password reset with Cookie Bite (powered by Clerk)."
          : "Request a secure password reset from the sign-in page — we never send passwords by email."
      }
      primaryAction={{ href: "/sign-in", label: "Go to sign in" }}
      secondaryAction={{ href: "/help", label: "Help center" }}
    >
      <p>
        If you clicked a link in an email, continue on the sign-in screen and choose{" "}
        <strong>Forgot password?</strong> if prompted.
      </p>
      <p>
        Didn&apos;t request a reset? You can ignore this — your password stays the same.{" "}
        <Link href="/contact" className="font-bold text-cb-terracotta-dark hover:underline">
          Contact support
        </Link>{" "}
        if this keeps happening.
      </p>
    </UtilityPageShell>
  );
}
