import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { SiteLogoLink } from "@/components/brand/site-logo";
import { SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  imageSrc: string;
  imageAlt: string;
  /** Show the same art above the form on small screens (sidebar is hidden). */
  showMobileImageStrip?: boolean;
  imageClassName?: string;
};

export function AuthSplitLayout({
  children,
  imageSrc,
  imageAlt,
  showMobileImageStrip = false,
  imageClassName = "object-cover",
}: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-cb-cream via-cb-peach/30 to-cb-cream px-3 py-8 sm:px-4 md:py-12 dark:from-cb-cream dark:via-cb-peach-deep/25 dark:to-cb-cream">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 20% 20%, rgba(217,245,232,0.45), transparent 60%), radial-gradient(ellipse 50% 45% at 85% 75%, rgba(245,217,217,0.35), transparent 55%)",
        }}
      />
      <div className="relative flex w-full max-w-[min(100%,58rem)] min-h-0 flex-col overflow-hidden rounded-[1.35rem] bg-cb-surface shadow-[var(--shadow-editorial)] ring-1 ring-cb-peach-deep/80 dark:bg-cb-surface-elevated dark:ring-cb-border md:min-h-[min(88vh,580px)] md:max-h-[min(92vh,680px)] md:flex-row md:rounded-2xl">
        <div className="relative hidden min-h-[280px] md:block md:w-[min(44%,21rem)] md:shrink-0 md:max-w-none">
          <Link
            href="/"
            className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm transition duration-200 hover:bg-black/65 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Back to home"
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
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
            aria-hidden
          />
          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <p className="max-w-[16rem] font-serif text-lg font-semibold leading-snug text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] md:text-xl">
              {SITE.tagline}
            </p>
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-white/90">
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Encrypted sign-in · Cookie Bite
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center overflow-x-hidden cb-gutter py-8 sm:py-10">
          <div className="mb-6 w-full max-w-[23.5rem]">
            <SiteLogoLink
              showTagline={false}
              className="justify-center md:justify-start"
            />
          </div>
          {showMobileImageStrip ? (
            <div className="relative mb-7 h-44 w-full max-w-[23.5rem] overflow-hidden rounded-2xl shadow-md ring-1 ring-cb-peach-deep/50 dark:ring-cb-border md:hidden">
              <img
                src={imageSrc}
                alt={imageAlt}
                className={cn("absolute inset-0 h-full w-full object-cover", imageClassName)}
                decoding="async"
                fetchPriority="high"
              />
            </div>
          ) : null}
          <div
            className="auth-form-scroll w-full max-w-[23.5rem] min-w-0 shrink max-h-[min(90dvh,720px)] overflow-y-auto overflow-x-hidden overscroll-y-contain"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
