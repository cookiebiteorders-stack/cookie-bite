import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/** شعار الترويسة — أيقونة CB + اسم العلامة (بدون شعار PNG القديم وشريط on every screen). */
export function SiteLogoLink({ className }: Props) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-3",
        "transition-[opacity,transform] duration-300 hover:opacity-90",
        className,
      )}
      aria-label={SITE.name}
    >
      <LogoMark
        className="h-9 w-9 text-cb-brand-logo sm:h-10 sm:w-10"
        aria-hidden
      />
      <span
        className={cn(
          "truncate font-sans text-base font-bold uppercase leading-none tracking-[0.14em] text-cb-brand-logo",
          "sm:text-lg sm:tracking-[0.16em]",
        )}
      >
        {SITE.name}
      </span>
    </Link>
  );
}
