import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/data";
import { cn } from "@/lib/utils";

type Props = {
  /** @deprecated الشعار الفرعي مدمج في cookie-bite-wordmark.png */
  showTagline?: boolean;
  className?: string;
};

/** شعار الترويسة — PNG أفقي (CB + COOKIE BITE + شريط on every screen). */
export function SiteLogoLink({ className }: Props) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex min-w-0 shrink-0 items-center",
        "transition-[opacity,transform] duration-300 hover:opacity-90",
        className,
      )}
    >
      <Image
        src="/brand/cookie-bite-wordmark.png"
        alt={`${SITE.name} — ${SITE.tagline}`}
        width={360}
        height={96}
        priority
        className="h-9 w-auto max-w-[min(260px,58vw)] object-contain object-left sm:h-10 sm:max-w-[280px]"
        sizes="(max-width: 640px) 58vw, 280px"
      />
    </Link>
  );
}
