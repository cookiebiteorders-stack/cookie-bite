"use client";

import { useReducedMotion } from "motion/react";
import {
  motionTokens,
  sharedLayoutTransition,
} from "@/lib/motion/presets";

export { motionTokens, sharedLayoutTransition };

/** لمشاركة layoutId — عطّل عند تقليل الحركة */
export function useSharedLayoutId(baseId: string) {
  const prefersReduced = useReducedMotion();
  return prefersReduced ? undefined : baseId;
}
