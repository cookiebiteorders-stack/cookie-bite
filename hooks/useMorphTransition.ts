"use client";

import { useMorphTransitionContext } from "@/components/providers/morph-transition-provider";

/**
 * Orchestrates DOM capture → language swap → WebGL morph (see MorphTransitionProvider).
 * التطبيق يستخدم نظام الترجمة الداخلي (`LanguageProvider`) وليس i18next؛ السلوك مطابق لعقد الـ UX.
 */
export function useMorphTransition() {
  return useMorphTransitionContext();
}
