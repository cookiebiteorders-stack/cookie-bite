import Link from "next/link";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import { SiteLogoLink } from "@/components/brand/site-logo";
import { AuthButton } from "@/components/auth/auth-button";
import { SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  children: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  title?: string;
  subtitle?: string;
  showAlternateAuth?: boolean;
  switchLabel?: string;
  switchHref?: string;
  switchCta?: string;
  imageClassName?: string;
  compactMobilePreview?: boolean;
  /** شارة صغيرة فوق العنوان */
  badge?: string;
};

export function AuthLayout({
  children,
  imageSrc,
  imageAlt,
  title,
  subtitle,
  showAlternateAuth = true,
  switchLabel = "",
  switchHref = "",
  switchCta = "",
  imageClassName = "object-cover",
  compactMobilePreview = false,
  badge,
}: AuthLayoutProps) {
  const showSwitch = Boolean(showAlternateAuth && switchHref && switchCta);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-gradient-to-br from-cb-cream via-cb-peach/25 to-cb-cream-2 px-3 py-3 sm:px-4 sm:py-6 dark:from-neutral-950 dark:via-stone-900/95 dark:to-neutral-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(193,105,44,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(251,146,60,0.08),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-[1000px] min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-3xl border border-cb-border/60 bg-cb-surface/90 shadow-[var(--shadow-editorial)] backdrop-blur-sm dark:border-stone-700/60 dark:bg-stone-950/80 sm:min-h-[calc(100dvh-3rem)] md:flex-row md:items-stretch">
        <aside className="relative hidden w-[44%] min-w-[300px] md:block">
          <Link
            href="/"
            className="absolute left-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65 hover:scale-105"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <img
            src={imageSrc}
            alt={imageAlt}
            className={cn("absolute inset-0 h-full w-full", imageClassName)}
            decoding="async"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10"
            aria-hidden
          />
          <div className="absolute bottom-8 left-7 right-7 space-y-3 text-white">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {SITE.name}
            </p>
            <p className="font-serif text-2xl font-semibold leading-snug drop-shadow-sm">
              {SITE.tagline}
            </p>
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/85">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              Secure authentication
            </p>
          </div>
        </aside>

        <section className="flex w-full min-h-0 flex-1 shrink-0 flex-col gap-3 overflow-x-hidden overscroll-x-none p-3 sm:p-5 md:grow md:justify-center md:gap-5 md:px-9 md:py-9">
          <div className="mx-auto w-full max-w-[440px] space-y-3">
            <div className="flex items-center justify-between gap-3 md:block">
              <Link
                href="/"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cb-border bg-cb-surface-elevated text-cb-text-strong transition hover:bg-cb-peach/40 md:hidden"
                aria-label="Back to home"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <SiteLogoLink showTagline={false} className="flex-1 justify-center md:justify-start" />
              <span className="w-9 md:hidden" aria-hidden />
            </div>

            {title || subtitle || badge ? (
              <div className="space-y-2 text-center md:text-start">
                {badge ? (
                  <p className="inline-flex rounded-full bg-cb-peach/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-cb-terracotta-dark dark:bg-amber-950/50 dark:text-amber-200">
                    {badge}
                  </p>
                ) : null}
                {title ? (
                  <h1 className="font-serif text-2xl font-bold tracking-tight text-cb-text-strong sm:text-[1.75rem]">
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p className="text-sm leading-relaxed text-cb-text-muted sm:text-[0.9375rem]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                "relative hidden overflow-hidden rounded-2xl ring-1 ring-cb-border/60 min-[420px]:block md:hidden",
                compactMobilePreview ? "h-[4.5rem] sm:h-20" : "h-24 sm:h-28",
              )}
            >
              <img
                src={imageSrc}
                alt=""
                role="presentation"
                className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" aria-hidden />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[440px] min-h-0 min-w-0">{children}</div>

          {showSwitch ? (
            <div className="mx-auto w-full max-w-[440px] rounded-2xl border border-dashed border-cb-border bg-cb-cream-2/50 p-4 dark:border-stone-700 dark:bg-stone-900/40">
              <p className="mb-3 text-center text-sm text-cb-text-muted md:text-start">
                {switchLabel}
              </p>
              <Link href={switchHref} className="block">
                <AuthButton
                  type="button"
                  className="h-11 border-2 border-cb-border bg-cb-surface text-cb-text-strong shadow-none hover:bg-cb-peach/50"
                >
                  {switchCta}
                </AuthButton>
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
