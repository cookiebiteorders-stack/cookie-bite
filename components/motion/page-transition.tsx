"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { LokiTransform } from "@/lib/effects/loki-transform";
import { usePageTransitionMotion } from "@/lib/motion/hooks";

type Props = {
  children: React.ReactNode;
};

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const pageMotion = usePageTransitionMotion();
  const shellRef = useRef<HTMLDivElement>(null);
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = pathname;
    if (prev === null || prev === pathname) return;
    if (prefersReducedMotion) return;
    const el = shellRef.current;
    if (!el) return;
    void new LokiTransform({ particleCount: 72 }).playRouteArrival(el);
  }, [pathname, prefersReducedMotion]);

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        ref={shellRef}
        key={pathname}
        data-loki="page-route"
        className="min-h-0 w-full will-change-[opacity,transform]"
        {...(pageMotion.reduced
          ? { initial: false, transition: { duration: 0.01 } }
          : {
              initial: pageMotion.initial,
              animate: pageMotion.animate,
              exit: pageMotion.exit,
              transition: pageMotion.transition,
            })}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
