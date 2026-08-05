/**
 * Database query logging utility
 * Tracks slow queries and provides performance insights
 */

type QueryLog = {
  timestamp: number;
  query: string;
  duration: number;
  table?: string;
  operation?: string;
};

const queryLogs: QueryLog[] = [];
const MAX_LOGS = 1000;
const SLOW_QUERY_THRESHOLD_MS = 100;

/**
 * Log a database query
 */
export function logQuery(query: string, duration: number, table?: string, operation?: string): void {
  const log: QueryLog = {
    timestamp: Date.now(),
    query,
    duration,
    table,
    operation,
  };

  queryLogs.push(log);

  // Keep only last MAX_LOGS
  if (queryLogs.length > MAX_LOGS) {
    queryLogs.shift();
  }

  // Alert on slow queries
  if (duration > SLOW_QUERY_THRESHOLD_MS) {
    console.warn(`[db-query-logger] Slow query detected: ${duration}ms`, {
      table,
      operation,
      query: query.substring(0, 200),
    });
  }
}

/**
 * Get slow queries
 */
export function getSlowQueries(thresholdMs: number = SLOW_QUERY_THRESHOLD_MS): QueryLog[] {
  return queryLogs.filter(log => log.duration > thresholdMs);
}

/**
 * Get query statistics
 */
export function getQueryStats(): {
  totalQueries: number;
  avgDuration: number;
  slowQueries: number;
  slowQueryRate: number;
  topSlowQueries: Array<{ query: string; duration: number; table?: string }>;
} {
  if (queryLogs.length === 0) {
    return {
      totalQueries: 0,
      avgDuration: 0,
      slowQueries: 0,
      slowQueryRate: 0,
      topSlowQueries: [],
    };
  }

  const totalDuration = queryLogs.reduce((sum, log) => sum + log.duration, 0);
  const slowQueries = getSlowQueries();
  const avgDuration = totalDuration / queryLogs.length;

  const topSlowQueries = slowQueries
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 10)
    .map(log => ({
      query: log.query.substring(0, 200),
      duration: log.duration,
      table: log.table,
    }));

  return {
    totalQueries: queryLogs.length,
    avgDuration,
    slowQueries: slowQueries.length,
    slowQueryRate: slowQueries.length / queryLogs.length,
    topSlowQueries,
  };
}

/**
 * Clear query logs
 */
export function clearQueryLogs(): void {
  queryLogs.length = 0;
}

/**
 * Log query performance report
 */
export function logQueryPerformanceReport(): void {
  const stats = getQueryStats();
  
  console.info("[db-query-logger] Query Performance Report:");
  console.info(`  Total Queries: ${stats.totalQueries}`);
  console.info(`  Average Duration: ${stats.avgDuration.toFixed(2)}ms`);
  console.info(`  Slow Queries: ${stats.slowQueries} (${(stats.slowQueryRate * 100).toFixed(2)}%)`);
  console.info(`  Top Slow Queries:`);
  
  for (const { query, duration, table } of stats.topSlowQueries.slice(0, 5)) {
    console.info(`    ${table || 'unknown'}: ${duration}ms - ${query}`);
  }
}
