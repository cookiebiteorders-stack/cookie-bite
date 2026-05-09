"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "@/components/providers/language-provider";
import { spring } from "@/lib/motion/presets";

type Status = "idle" | "loading" | "sent" | "error";

export function NewsletterBanner() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "home-banner" }),
      });
      if (!res.ok) throw new Error("subscribe failed");
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  const buttonLabel =
    status === "loading"
      ? t("newsletter.loading")
      : status === "sent"
        ? t("newsletter.sent")
        : status === "error"
          ? t("newsletter.errorRetry")
          : t("newsletter.subscribe");

  return (
    <section className="mx-auto max-w-7xl cb-gutter pb-16 lg:pb-20">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={spring.soft}
        className="relative overflow-hidden rounded-2xl border border-cb-peach-deep bg-cb-terracotta-dark text-white shadow-[0_24px_60px_-20px_rgba(43,26,14,0.35)] dark:border-cb-border dark:bg-gradient-to-br dark:from-[#3d2a1f] dark:to-cb-terracotta-dark dark:shadow-[0_28px_80px_-24px_rgba(0,0,0,0.55)]"
      >
        <div
          className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-cb-pink/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-cb-mint/20 blur-2xl"
          aria-hidden
        />
        <div className="relative grid gap-8 p-5 sm:gap-10 sm:p-8 md:p-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
          <div className="relative max-w-xl lg:pt-2">
            <div className="absolute -left-2 top-0 hidden h-16 w-3 rounded-full bg-gradient-to-b from-cb-mint to-cb-pink opacity-90 lg:block" />
            <div className="flex items-start gap-4 lg:ps-4">
              <span className="mt-1 flex h-12 w-12 shrink-0 rotate-[-3deg] items-center justify-center rounded-xl border border-white/30 bg-white/12 shadow-inner">
                <Mail className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                  {t("newsletter.title")}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/85 sm:text-base">
                  {t("newsletter.body")}
                </p>
              </div>
            </div>
          </div>
          <form
            onSubmit={onSubmit}
            className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch lg:flex-col xl:flex-row xl:items-center"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              {t("newsletter.emailLabel")}
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletter.placeholder")}
              className="cb-touch-manipulation min-h-[3rem] w-full flex-1 rounded-xl border border-white/35 bg-white/12 px-4 text-base text-white placeholder:text-white/70 outline-none transition duration-300 focus-visible:border-white focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-cb-terracotta-dark"
            />
            <motion.button
              type="submit"
              disabled={status === "loading"}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="cb-touch-manipulation min-h-[3rem] shrink-0 rounded-xl border border-cb-peach-deep/60 bg-white px-6 text-base font-bold text-cb-terracotta-dark transition-[box-shadow,background-color] duration-300 ease-[cubic-bezier(0.33,1,0.68,1)] hover:shadow-md disabled:opacity-70 dark:border-cb-border dark:bg-cb-cream-2 dark:text-cb-terracotta-dark"
            >
              {buttonLabel}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </section>
  );
}
