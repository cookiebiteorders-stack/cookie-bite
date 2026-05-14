import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  showTagline?: boolean;
  className?: string;
};

/** شعار الترويسة — الشعار الأفقي الرسمي (PNG). */
export function SiteLogoLink({ showTagline = true, className }: Props) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex min-w-0 shrink-0 flex-col justify-center gap-1",
        "transition-[opacity,transform] duration-300 hover:opacity-90",
        className,
      )}
    >
      <Image
        src="/brand/cookie-bite-wordmark.png"
        alt={`${SITE.name} logo`}
        width={320}
        height={80}
        priority
        className="h-8 w-auto max-w-[min(220px,52vw)] object-contain object-left sm:h-9 sm:max-w-[240px]"
        sizes="(max-width: 640px) 52vw, 240px"
      />
      {showTagline ? (
        <span className="hidden text-[11px] leading-tight text-white sm:block">
          {SITE.tagline}
        </span>
      ) : null}
    </Link>
  );
}
