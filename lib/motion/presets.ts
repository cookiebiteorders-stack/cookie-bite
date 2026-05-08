/** منحنيات وزمن موحّد لحركة «يدوية» — يُستخدم مع `motion/react` (نفس نواة Framer Motion). */

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeSoft = [0.33, 1, 0.68, 1] as const;
export const easeSpringy = [0.22, 1, 0.36, 1] as const;

export const duration = {
  micro: 0.18,
  short: 0.32,
  medium: 0.48,
  page: 0.42,
  cinematic: 0.72,
} as const;

export const spring = {
  snappy: { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.85 },
  soft: { type: "spring" as const, stiffness: 280, damping: 32, mass: 1 },
  gentle: { type: "spring" as const, stiffness: 200, damping: 38, mass: 1.1 },
};

/** واجهة موحّدة مع طلب المستخدم — مدة سريعة/متوسطة/بطيئة */
export const motionTokens = {
  fast: 0.2,
  medium: 0.4,
  slow: 0.7,
  easing: [0.22, 1, 0.36, 1] as const,
} as const;

/** انتقال مشترك لـ layoutId (صورة منتج إلخ) */
export const sharedLayoutTransition = {
  type: "spring" as const,
  stiffness: 320,
  damping: 34,
  mass: 0.95,
};
