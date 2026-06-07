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
  badge?: string;
  backHomeLabel?: string;
  secureAuthLabel?: string;
  asideTagline?: string;
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
  backHomeLabel = "Back to home",
  secureAuthLabel = "Secure authentication",
  asideTagline,
}: AuthLayoutProps) {
  const showSwitch = Boolean(showAlternateAuth && switchHref && switchCta);
  const tagline = asideTagline ?? SITE.tagline;

  return (
    <div className="auth-page relative min-h-dvh overflow-x-hidden">
      <div className="auth-page__backdrop pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -5%, color-mix(in oklab, var(--cb-brand-200) 65%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1040px] flex-col px-0 py-0 sm:px-4 sm:py-6 lg:py-8">
        <div
          className={cn(
            "auth-page__card relative flex min-h-dvh w-full flex-col overflow-x-hidden overflow-y-auto sm:overflow-hidden",
            "border border-cb-border/70 bg-cb-surface/95 backdrop-blur-md",
            "dark:border-cb-border dark:bg-cb-surface/95",
            "sm:min-h-[min(100dvh-3rem,720px)] sm:rounded-3xl",
            "md:min-h-[min(100dvh-4rem,760px)] md:flex-row md:items-stretch",
          )}
        >
          <aside
            className={cn(
              "auth-page__aside relative hidden shrink-0 md:block md:w-[min(42%,22rem)] lg:w-[min(44%,24rem)]",
            )}
          >
            <Link
              href="/"
              className="absolute left-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cb-scrim-strong/80 text-cb-on-dark backdrop-blur-md transition hover:bg-cb-dark-accent/90 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-brand-300"
              aria-label={backHomeLabel}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
            <img
              src={imageSrc}
              alt={imageAlt}
              className={cn("absolute inset-0 h-full w-full", imageClassName)}
              decoding="async"
              fetchPriority="high"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-cb-dark-accent/90 via-cb-scrim-strong/35 to-cb-brand-900/20"
              aria-hidden
            />
            <div className="absolute bottom-8 left-7 right-7 space-y-3 text-cb-on-dark">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-cb-brand-200" aria-hidden />
                {SITE.name}
              </p>
              <p className="font-serif text-2xl font-semibold leading-snug drop-shadow-md lg:text-[1.65rem]">
                {tagline}
              </p>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/85">
                <Lock className="h-3.5 w-3.5 shrink-0 text-cb-brand-200" aria-hidden />
                {secureAuthLabel}
              </p>
            </div>
          </aside>

          <section
            className={cn(
              "auth-page__panel flex min-h-0 min-w-0 flex-1 flex-col",
              "gap-4 overflow-x-hidden overscroll-x-none",
              "px-4 py-5 sm:gap-5 sm:px-7 sm:py-7",
              "md:justify-center md:gap-6 md:px-10 md:py-10",
            )}
          >
            <header className="auth-page__form-zone mx-auto w-full space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3 md:justify-start">
                <Link
                  href="/"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cb-border bg-cb-surface-elevated text-cb-text-strong shadow-sm transition hover:border-cb-brand-300 hover:bg-cb-brand-50 md:hidden"
                  aria-label={backHomeLabel}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </Link>
                <SiteLogoLink className="flex-1 justify-center md:flex-none md:justify-start" />
                <span className="w-10 md:hidden" aria-hidden />
              </div>

              {title || subtitle || badge ? (
                <div className="space-y-2 text-center md:text-start">
                  {badge ? (
                    <p className="inline-flex rounded-full bg-cb-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-cb-brand-800 ring-1 ring-cb-brand-200/80 dark:bg-cb-brand-900/40 dark:text-cb-brand-200 dark:ring-cb-brand-700/50">
                      {badge}
                    </p>
                  ) : null}
                  {title ? (
                    <h1 className="font-serif text-[1.65rem] font-bold leading-tight tracking-tight text-cb-text-strong sm:text-3xl">
                      {title}
                    </h1>
                  ) : null}
                  {subtitle ? (
                    <p className="mx-auto max-w-md text-sm leading-relaxed text-cb-text-muted sm:text-[0.9375rem] md:mx-0">
                      {subtitle}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl ring-1 ring-cb-border/80 md:hidden",
                  compactMobilePreview ? "h-[5.5rem] sm:h-24" : "h-28 sm:h-32",
                )}
              >
                <img
                  src={imageSrc}
                  alt=""
                  role="presentation"
                  className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
                  decoding="async"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-cb-dark-accent/65 via-cb-scrim-soft/30 to-transparent"
                  aria-hidden
                />
                <p className="absolute bottom-3 left-3 max-w-[70%] text-xs font-semibold text-cb-on-dark drop-shadow-sm">
                  {tagline}
                </p>
              </div>
            </header>

            <div className="auth-page__form-zone mx-auto w-full min-w-0 shrink-0 md:overflow-visible">
              {children}
            </div>

            {showSwitch ? (
              <div className="auth-page__form-zone mx-auto w-full rounded-2xl border border-dashed border-cb-brand-200 bg-cb-brand-50/60 p-4 dark:border-cb-border dark:bg-cb-surface-2/80">
                <p className="mb-3 text-center text-sm text-cb-text-muted md:text-start">
                  {switchLabel}
                </p>
                <Link href={switchHref} className="block">
                  <AuthButton
                    type="button"
                    className="h-11 border-2 border-cb-brand-300 bg-cb-surface text-cb-brand-800 shadow-none hover:border-cb-brand-400 hover:bg-cb-brand-100 dark:border-cb-border dark:bg-cb-surface-elevated dark:text-cb-text-strong dark:hover:bg-cb-peach/30"
                  >
                    {switchCta}
                  </AuthButton>
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
