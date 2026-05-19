"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UtilityPageShell } from "@/components/pages/utility-page-shell";
import { buttonClassName } from "@/components/ui/button";

export function UnsubscribePageBody() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Unsubscribe failed");
      }
      setStatus("success");
      setMessage("You have been unsubscribed from marketing emails. Order updates may still be sent.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <UtilityPageShell
      eyebrow="Email preferences"
      title="Unsubscribe"
      subtitle="Stop promotional emails from Cookie Bite. Transactional messages about your orders may still arrive."
      secondaryAction={{ href: "/account/settings", label: "Account settings" }}
    >
      {status === "success" ? (
        <p className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          {message}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-cb-text-muted">
              Email address
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-cb-border bg-cb-surface px-4 py-3 text-base outline-none focus:ring-2 focus:ring-cb-focus"
              placeholder="you@example.com"
            />
          </label>
          <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />
          <button
            type="submit"
            disabled={status === "loading"}
            className={buttonClassName("primary", "w-full rounded-full py-3 sm:w-auto sm:px-10")}
          >
            {status === "loading" ? "Processing…" : "Unsubscribe"}
          </button>
          {message && status === "error" ? (
            <p className="text-sm font-semibold text-red-600">{message}</p>
          ) : null}
        </form>
      )}
    </UtilityPageShell>
  );
}
