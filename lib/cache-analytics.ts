/**
 * Cache analytics utility
 * Tracks cache hit rates, miss rates, and performance metrics
 */

type CacheStats = {
  hits: number;
  misses: number;
  total: number;
  hitRate: number;
  avgResponseTime: number;
};

const cacheMetrics = new Map<string, CacheStats>();

/**
 * Record a cache hit
 */
export function recordCacheHit(key: string, responseTime: number): void {
  const stats = cacheMetrics.get(key) || {
    hits: 0,
    misses: 0,
    total: 0,
    hitRate: 0,
    avgResponseTime: 0,
  };
  
  stats.hits++;
  stats.total++;
  stats.hitRate = stats.hits / stats.total;
  
  // Update average response time
  stats.avgResponseTime = (stats.avgResponseTime * (stats.total - 1) + responseTime) / stats.total;
  
  cacheMetrics.set(key, stats);
}

/**
 * Record a cache miss
 */
export function recordCacheMiss(key: string): void {
  const stats = cacheMetrics.get(key) || {
    hits: 0,
    misses: 0,
    total: 0,
    hitRate: 0,
    avgResponseTime: 0,
  };
  
  stats.misses++;
  stats.total++;
  stats.hitRate = stats.hits / stats.total;
  
  cacheMetrics.set(key, stats);
}

/**
 * Get cache statistics for a specific key
 */
export function getCacheStats(key: string): CacheStats | undefined {
  return cacheMetrics.get(key);
}

/**
 * Get all cache statistics
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return Object.fromEntries(cacheMetrics);
}

/**
 * Get overall cache performance
 */
export function getOverallCachePerformance(): {
  totalHits: number;
  totalMisses: number;
  totalRequests: number;
  overallHitRate: number;
  topMissedKeys: Array<{ key: string; misses: number }>;
} {
  let totalHits = 0;
  let totalMisses = 0;
  const topMissedKeys: Array<{ key: string; misses: number }> = [];

  for (const [key, stats] of cacheMetrics.entries()) {
    totalHits += stats.hits;
    totalMisses += stats.misses;
    
    if (stats.misses > 0) {
      topMissedKeys.push({ key, misses: stats.misses });
    }
  }

  topMissedKeys.sort((a, b) => b.misses - a.misses);
  const totalRequests = totalHits + totalMisses;

  return {
    totalHits,
    totalMisses,
    totalRequests,
    overallHitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
    topMissedKeys: topMissedKeys.slice(0, 10),
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  cacheMetrics.clear();
}

/**
 * Log cache performance report
 */
export function logCachePerformanceReport(): void {
  const performance = getOverallCachePerformance();
  
  console.info("[cache-analytics] Cache Performance Report:");
  console.info(`  Total Requests: ${performance.totalRequests}`);
  console.info(`  Hits: ${performance.totalHits} (${(performance.overallHitRate * 100).toFixed(2)}%)`);
  console.info(`  Misses: ${performance.totalMisses} (${((1 - performance.overallHitRate) * 100).toFixed(2)}%)`);
  console.info(`  Top Missed Keys:`);
  
  for (const { key, misses } of performance.topMissedKeys.slice(0, 5)) {
    console.info(`    ${key}: ${misses} misses`);
  }
}
