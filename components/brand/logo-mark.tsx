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
export function LogoMark({ className, title, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
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
