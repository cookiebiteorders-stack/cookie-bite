"use client";

const BEHAVIOR_KEY = "cb_ann_behaviors";

export const BEHAVIOR_FLAGS = [
  "viewed_product",
  "add_to_cart",
  "abandoned_cart",
  "purchased",
  "logged_in",
] as const;

export type BehaviorFlag = (typeof BEHAVIOR_FLAGS)[number];

function readBehaviors(): Set<BehaviorFlag> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(BEHAVIOR_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr.filter((b): b is BehaviorFlag => BEHAVIOR_FLAGS.includes(b as BehaviorFlag)));
  } catch {
    return new Set();
  }
}

function writeBehaviors(set: Set<BehaviorFlag>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BEHAVIOR_KEY, JSON.stringify([...set]));
  } catch {
    /* quota */
  }
}

export function getClientBehaviors(): BehaviorFlag[] {
  return [...readBehaviors()];
}

export function markClientBehavior(flag: BehaviorFlag) {
  const set = readBehaviors();
  if (set.has(flag)) return;
  set.add(flag);
  writeBehaviors(set);
  window.dispatchEvent(new CustomEvent("cookiebite:behaviors-changed"));
}
