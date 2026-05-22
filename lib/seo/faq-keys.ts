/** FAQ item keys — shared by UI and server-side JSON-LD */
export const FAQ_ITEM_KEYS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
] as const;

export type FaqItemKey = (typeof FAQ_ITEM_KEYS)[number];
