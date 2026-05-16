import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { SiteLogoLink } from "@/components/brand/site-logo";
import { AuthButton } from "@/components/auth/auth-button";
import { SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  children: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  /** عنوان الصفحة — اتركه فارغاً أو احذف الخاصية لإخفاء كتلة العنوان بالكامل */
  title?: string;
  subtitle?: string;
  /** زر التبديل إلى تسجيل / دخول في أسفل القسم — عطّله في صفحة الدخول إن رغبت */
  showAlternateAuth?: boolean;
  switchLabel?: string;
  switchHref?: string;
  switchCta?: string;
  imageClassName?: string;
  /** ارتفاع أصغر لشريط الصورة على الجوال (يناسب نماذج قصيرة مثل تسجيل الدخول) */
  compactMobilePreview?: boolean;
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
}: AuthLayoutProps) {
  const showSwitch = Boolean(showAlternateAuth && switchHref && switchCta);

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-cb-cream via-cb-peach/30 to-cb-cream px-3 py-3 sm:px-4 sm:py-6 dark:from-neutral-950 dark:via-stone-900 dark:to-neutral-950">
      <div className="mx-auto flex w-full max-w-[980px] min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-3xl border border-cb-border/70 bg-cb-surface shadow-[var(--shadow-editorial)] dark:bg-transparent sm:min-h-[calc(100dvh-3rem)] md:flex-row md:items-stretch">
        <aside className="relative hidden w-[42%] min-w-[320px] md:block">
          <Link
            href="/"
            className="absolute left-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
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
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" aria-hidden />
          <div className="absolute bottom-6 left-6 right-6 space-y-2 text-white">
            <p className="font-serif text-xl font-semibold">{SITE.tagline}</p>
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/90">
              <Lock className="h-3.5 w-3.5" />
              Secure authentication
            </p>
          </div>
        </aside>

        <section className="flex w-full min-h-0 flex-1 shrink-0 flex-col gap-3 overflow-x-hidden overscroll-x-none p-3 sm:p-5 md:grow md:justify-center md:gap-4 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[460px] space-y-3">
            <SiteLogoLink showTagline={false} className="justify-center md:justify-start" />
            {title || subtitle ? (
              <div className="space-y-2">
                {title ? (
                  <h1 className="text-2xl font-bold tracking-tight text-cb-text-strong sm:text-3xl">{title}</h1>
                ) : null}
                {subtitle ? (
                  <p className="text-sm leading-relaxed text-cb-text-muted sm:text-base">{subtitle}</p>
                ) : null}
              </div>
            ) : null}
            <div
              className={cn(
                "relative hidden overflow-hidden rounded-2xl min-[420px]:block md:hidden",
                compactMobilePreview ? "h-16 sm:h-20" : "h-24 sm:h-28",
              )}
            >
              <img
                src={imageSrc}
                alt={imageAlt}
                className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[460px] min-h-0 min-w-0 overflow-x-visible">{children}</div>

          {showSwitch ? (
            <div className="mx-auto w-full max-w-[460px] rounded-2xl border border-cb-border bg-cb-surface-elevated p-3 sm:p-4 dark:border-cb-border dark:bg-transparent">
              <p className="mb-2 text-sm text-cb-text-muted">{switchLabel}</p>
              <Link href={switchHref} className="block">
                <AuthButton type="button" className="h-11">
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

