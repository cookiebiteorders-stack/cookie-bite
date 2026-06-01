import {
  DEFAULT_GIFT_BOX_STATE,
  GIFT_BOX_STORAGE_KEY,
  type GiftBoxBuilderState,
} from "@/lib/gift-box-builder/types";

export function loadStoredGiftBoxState(): GiftBoxBuilderState {
  if (typeof window === "undefined") return { ...DEFAULT_GIFT_BOX_STATE };
  try {
    const saved = localStorage.getItem(GIFT_BOX_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<GiftBoxBuilderState>;
      return { ...DEFAULT_GIFT_BOX_STATE, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_GIFT_BOX_STATE };
}

export function persistGiftBoxState(state: GiftBoxBuilderState) {
  try {
    localStorage.setItem(GIFT_BOX_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function pruneItemsToCatalog(
  items: Record<string, number>,
  validIds: Set<string>,
): Record<string, number> {
  return Object.fromEntries(Object.entries(items).filter(([id]) => validIds.has(id)));
}
