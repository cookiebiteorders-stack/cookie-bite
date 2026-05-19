"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UtilityPageShell } from "@/components/pages/utility-page-shell";

export function VerifyPageBody() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim();

  return (
    <UtilityPageShell
      eyebrow="Account"
      title="Verify your email"
      subtitle="Confirm your address to unlock orders, wishlist sync, and faster checkout."
      primaryAction={{ href: "/sign-in", label: "Sign in" }}
      secondaryAction={{ href: "/sign-up", label: "Create account" }}
    >
      {code ? (
        <p className="rounded-2xl border border-cb-border bg-cb-surface p-4 font-mono text-base text-cb-text-strong">
          Your verification code: <strong>{code}</strong>
        </p>
      ) : (
        <p>
          Open the verification email and enter the code on the sign-in or sign-up screen. Codes
          expire after a short time for your security.
        </p>
      )}
      <p>
        Already verified?{" "}
        <Link href="/account/settings" className="font-bold text-cb-terracotta-dark hover:underline">
          Open account settings
        </Link>{" "}
        to review your profile.
      </p>
    </UtilityPageShell>
  );
}
