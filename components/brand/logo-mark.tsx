import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type Props = SVGProps<SVGSVGElement> & {
  /** عند false يُعرض عنوان للقارئ الشاشي (مثلاً داخل رابط يحتوي نصاً مرئياً) */
  title?: string;
};

/**
 * أيقونة العلامة — حلقة بأذنين (دب) بأسلوب الهوية البرتقالية.
 * يستخدم `currentColor`؛ عيّن `className="text-cb-brand-logo"`.
 */
/** Fallback when global CSS fails to load (PWA/offline); Tailwind classes override when present. */
const LOGO_MARK_FALLBACK_STYLE = {
  width: "2.5rem",
  height: "2.5rem",
  maxWidth: "100%",
  maxHeight: "4rem",
  flexShrink: 0,
  display: "block",
} as const;

export function LogoMark({ className, title, style, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={64}
      height={64}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("cb-logo-mark shrink-0", className)}
      style={{ ...LOGO_MARK_FALLBACK_STYLE, ...style }}
      role="img"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <circle
        cx="32"
        cy="38"
        r="19"
        stroke="currentColor"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <circle cx="21" cy="15" r="7.5" fill="currentColor" />
      <circle cx="43" cy="15" r="7.5" fill="currentColor" />
    </svg>
  );
}
