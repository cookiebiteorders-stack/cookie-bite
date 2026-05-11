import Image from "next/image";
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
  title: string;
  subtitle: string;
  switchLabel: string;
  switchHref: string;
  switchCta: string;
  imageClassName?: string;
};

export function AuthLayout({
  children,
  imageSrc,
  imageAlt,
  title,
  subtitle,
  switchLabel,
  switchHref,
  switchCta,
  imageClassName = "object-cover",
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-cb-cream via-cb-peach/30 to-cb-cream px-4 py-6 sm:py-10 dark:from-cb-cream dark:via-cb-peach-deep/20 dark:to-cb-cream">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[980px] overflow-hidden rounded-3xl border border-cb-border/70 bg-cb-surface shadow-[var(--shadow-editorial)]">
        <aside className="relative hidden w-[42%] min-w-[320px] md:block">
          <Link
            href="/"
            className="absolute left-5 top-5 z-10 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Image src={imageSrc} alt={imageAlt} fill className={imageClassName} priority />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" aria-hidden />
          <div className="absolute bottom-6 left-6 right-6 space-y-2 text-white">
            <p className="font-serif text-xl font-semibold">{SITE.tagline}</p>
            <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/90">
              <Lock className="h-3.5 w-3.5" />
              Secure authentication
            </p>
          </div>
        </aside>

        <section className="flex w-full flex-1 flex-col justify-center gap-4 p-4 sm:p-6 md:px-8 md:py-10">
          <div className="mx-auto w-full max-w-[460px] space-y-4">
            <SiteLogoLink showTagline={false} className="justify-center md:justify-start" />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-cb-text-strong sm:text-3xl">{title}</h1>
              <p className="text-sm leading-relaxed text-cb-text-muted sm:text-base">{subtitle}</p>
            </div>
            <div className="relative h-36 overflow-hidden rounded-2xl md:hidden">
              <Image
                src={imageSrc}
                alt={imageAlt}
                fill
                className={cn("object-cover", imageClassName)}
                sizes="(max-width: 768px) calc(100vw - 2rem), 0px"
                priority
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-[460px]">{children}</div>

          <div className="mx-auto w-full max-w-[460px] rounded-2xl border border-cb-border bg-cb-surface-elevated p-4">
            <p className="mb-3 text-sm text-cb-text-muted">{switchLabel}</p>
            <Link href={switchHref} className="block">
              <AuthButton type="button" className="h-11">
                {switchCta}
              </AuthButton>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

