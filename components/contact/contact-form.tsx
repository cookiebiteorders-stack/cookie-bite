"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const inputClasses =
  "w-full rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3.5 text-base text-cb-text placeholder:text-cb-text-muted/70 outline-none transition-colors focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background min-h-[2.75rem]";

const textareaClasses =
  "w-full min-h-[8rem] rounded-2xl border-2 border-cb-border bg-cb-surface px-4 py-3.5 text-base text-cb-text placeholder:text-cb-text-muted/70 outline-none transition-colors focus-visible:border-cb-terracotta-dark focus-visible:ring-2 focus-visible:ring-cb-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type FormStatus = "idle" | "loading" | "sent" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setStatus("loading");

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      subject: String(formData.get("subject") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error ?? "Could not send message");
      }
      setStatus("sent");
      e.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
    }
  }

  const buttonLabel =
    status === "loading"
      ? "Sending…"
      : status === "sent"
        ? "Sent — thank you!"
        : "Send message";

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-3xl border border-cb-border bg-cb-surface p-5 shadow-lg sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="contact-name"
            className="mb-1.5 block text-sm font-semibold text-cb-text-strong"
          >
            Name
          </label>
          <input
            id="contact-name"
            required
            name="name"
            placeholder="Your full name"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="mb-1.5 block text-sm font-semibold text-cb-text-strong"
          >
            Email
          </label>
          <input
            id="contact-email"
            required
            type="email"
            name="email"
            placeholder="you@example.com"
            className={inputClasses}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="contact-subject"
          className="mb-1.5 block text-sm font-semibold text-cb-text-strong"
        >
          Subject
        </label>
        <input
          id="contact-subject"
          required
          name="subject"
          placeholder="How can we help?"
          className={inputClasses}
        />
      </div>
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-sm font-semibold text-cb-text-strong"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          required
          name="message"
          rows={5}
          placeholder="Tell us a little about your order, gift, or question…"
          className={textareaClasses}
        />
      </div>
      {error && (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-2xl py-3"
      >
        {buttonLabel}
      </Button>
    </form>
  );
}
