/**
 * Bundle size monitoring utility
 * Tracks bundle sizes and alerts on size increases
 */

type BundleMetric = {
  name: string;
  size: number;
  gzipSize: number;
  timestamp: number;
};

const bundleMetrics = new Map<string, BundleMetric[]>();
const SIZE_THRESHOLD_BYTES = 500 * 1024; // 500KB
const GZIP_THRESHOLD_BYTES = 100 * 1024; // 100KB

/**
 * Record bundle size
 */
export function recordBundleSize(
  name: string,
  size: number,
  gzipSize: number
): void {
  const metric: BundleMetric = {
    name,
    size,
    gzipSize,
    timestamp: Date.now(),
  };

  const metrics = bundleMetrics.get(name) || [];
  metrics.push(metric);
  
  // Keep only last 100 entries per bundle
  if (metrics.length > 100) {
    metrics.shift();
  }
  
  bundleMetrics.set(name, metrics);

  // Alert on large bundles
  if (size > SIZE_THRESHOLD_BYTES) {
    console.warn(`[bundle-monitor] Large bundle detected: ${name} (${(size / 1024).toFixed(2)}KB)`);
  }
  
  if (gzipSize > GZIP_THRESHOLD_BYTES) {
    console.warn(`[bundle-monitor] Large gzip bundle detected: ${name} (${(gzipSize / 1024).toFixed(2)}KB)`);
  }
}

/**
 * Get bundle statistics
 */
export function getBundleStats(name: string): {
  name: string;
  avgSize: number;
  maxSize: number;
  minSize: number;
  avgGzipSize: number;
  maxGzipSize: number;
  count: number;
} | undefined {
  const metrics = bundleMetrics.get(name);
  if (!metrics || metrics.length === 0) return undefined;

  const sizes = metrics.map(m => m.size);
  const gzipSizes = metrics.map(m => m.gzipSize);

  return {
    name,
    avgSize: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    maxSize: Math.max(...sizes),
    minSize: Math.min(...sizes),
    avgGzipSize: gzipSizes.reduce((a, b) => a + b, 0) / gzipSizes.length,
    maxGzipSize: Math.max(...gzipSizes),
    count: metrics.length,
  };
}

/**
 * Get all bundle statistics
 */
export function getAllBundleStats(): Record<string, ReturnType<typeof getBundleStats>> {
  const result: Record<string, ReturnType<typeof getBundleStats>> = {};
  
  for (const [name] of bundleMetrics) {
    const stats = getBundleStats(name);
    if (stats) {
      result[name] = stats;
    }
  }
  
  return result;
}

/**
 * Get oversized bundles
 */
export function getOversizedBundles(): Array<{
  name: string;
  size: number;
  gzipSize: number;
  threshold: number;
}> {
  const oversized: Array<{ name: string; size: number; gzipSize: number; threshold: number }> = [];
  
  for (const [name, metrics] of bundleMetrics) {
    const latest = metrics[metrics.length - 1];
    if (latest && latest.size > SIZE_THRESHOLD_BYTES) {
      oversized.push({
        name,
        size: latest.size,
        gzipSize: latest.gzipSize,
        threshold: SIZE_THRESHOLD_BYTES,
      });
    }
  }
  
  return oversized.sort((a, b) => b.size - a.size);
}

/**
 * Log bundle performance report
 */
export function logBundlePerformanceReport(): void {
  const allStats = getAllBundleStats();
  const oversized = getOversizedBundles();
  
  console.info("[bundle-monitor] Bundle Performance Report:");
  console.info(`  Total Bundles: ${Object.keys(allStats).length}`);
  console.info(`  Oversized Bundles: ${oversized.length}`);
  
  if (oversized.length > 0) {
    console.info(`  Oversized Bundles:`);
    for (const { name, size, gzipSize, threshold } of oversized.slice(0, 5)) {
      console.info(`    ${name}: ${(size / 1024).toFixed(2)}KB (gzip: ${(gzipSize / 1024).toFixed(2)}KB, threshold: ${(threshold / 1024).toFixed(2)}KB)`);
    }
  }
  
  console.info(`  Bundle Statistics:`);
  for (const [name, stats] of Object.entries(allStats).slice(0, 10)) {
    if (stats) {
      console.info(`    ${name}: avg ${(stats.avgSize / 1024).toFixed(2)}KB, max ${(stats.maxSize / 1024).toFixed(2)}KB`);
    }
  }
}
