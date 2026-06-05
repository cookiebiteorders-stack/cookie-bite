/**
 * قواعد يدوية لـ «يُشترى معاً» — تُكمّل بيانات التوافق من الطلبات.
 * أضف slug المنتج → slugs المرافقين (حتى 2).
 */
export type FbtManualRule = {
  /** slugs منتجات مرافقة ثابتة */
  companions?: string[];
  /** اختيار مرافقين من فئات أخرى عند غياب companions */
  fromCategories?: string[];
};

/** قواعد حسب slug — أولوية أعلى */
export const FBT_RULES_BY_SLUG: Record<string, FbtManualRule> = {
  // مثال: "chocolate-chip": { companions: ["double-chocolate", "oatmeal-raisin"] },
};

/** قواعد حسب فئة المنتج */
export const FBT_RULES_BY_CATEGORY: Record<string, FbtManualRule> = {
  Gifts: { fromCategories: ["Cookies", "Classic"] },
  "Gift Boxes": { fromCategories: ["Cookies"] },
};

export const FBT_COMPANION_LIMIT = 2;
