"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { UtilityPageShell } from "@/components/pages/utility-page-shell";

export function ResetPageBody() {
  const searchParams = useSearchParams();
  const hasToken = Boolean(searchParams.get("token")?.trim());
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      if (!response.ok) {
        setNotice(json?.error ? "Please check your email and try again." : "Could not submit request.");
        return;
      }
      setNotice(
        json?.message ??
          "If an account exists for this email, a reset message has been sent.",
      );
      setEmail("");
    } catch {
      setNotice("Could not submit request.");
    } finally {
      setLoading(false);
    }
  }

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
      <form onSubmit={onSubmit} className="mb-5 space-y-3">
        <label className="block text-sm font-semibold text-cb-brown-dark dark:text-foreground" htmlFor="reset-email">
          Email address
        </label>
        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-cb-brown/20 bg-white px-4 py-3 text-sm text-cb-brown-dark outline-none transition focus:border-cb-terracotta dark:bg-card dark:text-foreground"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center rounded-full bg-cb-terracotta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cb-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset email"}
        </button>
        {notice ? <p className="text-sm text-cb-brown dark:text-muted-foreground">{notice}</p> : null}
      </form>

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
