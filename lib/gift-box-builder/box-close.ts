/** 0 = open, 1 = fully closed — driven by items vs capacity */
export function getBoxCloseProgress(totalItems: number, capacity: number): number {
  if (totalItems <= 0) return 0;
  if (capacity <= 0) return Math.min(1, totalItems / 6);
  return Math.min(1, totalItems / capacity);
}
