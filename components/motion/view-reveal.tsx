import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type RevealVariant =
  | "fade-up"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "zoom-soft"
  | "tilt-up";

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  staggerIndex?: number;
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

/** غلاف بسيط — بدون حركة دخول (أُزيلت انتقالات scroll-reveal). */
export function ViewReveal({ children, className, ...rest }: Props) {
  return (
    <div className={cn(className)} {...rest}>
      {children}
    </div>
  );
}
