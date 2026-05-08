"use client";

import { motion } from "motion/react";

type Props = {
  onClick: () => void;
  ariaLabel?: string;
};

export function Overlay({ onClick, ariaLabel = "Close menu" }: Props) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] dark:bg-black/65"
    />
  );
}
