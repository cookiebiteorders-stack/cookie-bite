"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { usePageTransitionMotion } from "@/lib/motion/hooks";

type Props = {
  children: React.ReactNode;
};

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  const pageMotion = usePageTransitionMotion();

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname}
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
