/** Star rating counts for approved product reviews (keys "1"–"5"). */
export type RatingDistribution = Record<"1" | "2" | "3" | "4" | "5", number>;

export function buildRatingDistribution(ratings: number[]): RatingDistribution {
  const dist: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of ratings) {
    const clamped = Math.min(5, Math.max(1, Math.round(Number(rating))));
    const star = String(clamped) as keyof RatingDistribution;
    dist[star] += 1;
  }
  return dist;
}

export function totalFromDistribution(dist: RatingDistribution): number {
  return dist[1] + dist[2] + dist[3] + dist[4] + dist[5];
}
