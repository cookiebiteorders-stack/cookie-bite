"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";
import { duration, easeOutExpo, easeSoft, spring } from "@/lib/motion/presets";

export type RevealVariant =
  | "fade-up"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "zoom-soft"
  | "tilt-up";

const variantMap: Record<RevealVariant, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: -36 },
    show: { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: 36 },
    show: { opacity: 1, x: 0 },
  },
  "zoom-soft": {
    hidden: { opacity: 0, scale: 0.94 },
    show: { opacity: 1, scale: 1 },
  },
  "tilt-up": {
    hidden: { opacity: 0, y: 40, rotate: -0.6 },
    show: { opacity: 1, y: 0, rotate: 0 },
  },
};

type Props = {
  children: React.ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
  staggerIndex?: number;
} & Omit<HTMLMotionProps<"div">, "children">;

export function ViewReveal({
  children,
  className,
  variant = "fade-up",
  delay = 0,
  staggerIndex = 0,
  ...rest
}: Props) {
  const reduce = useReducedMotion();
  const v = variantMap[variant];
  const stagger = staggerIndex * 0.07;

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      variants={v}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -12% 0px" }}
      transition={
        variant === "zoom-soft"
          ? { ...spring.soft, delay: delay + stagger }
          : {
              duration: duration.medium,
              ease:
                variant === "slide-left" || variant === "slide-right"
                  ? easeOutExpo
                  : easeSoft,
              delay: delay + stagger,
            }
      }
      {...rest}
    >
      {children}
    </motion.div>
  );
}
