import { NextResponse } from "next/server";
import { getIntegrationEnvStatus } from "@/lib/config/production-lock";
import { getCircuitState } from "@/lib/rate-limit/redis-rate-limiter";
import { getDedupStats } from "@/lib/request-deduplication";
import { getOverallCachePerformance } from "@/lib/cache-analytics";
import { getQueryStats } from "@/lib/db-query-logger";
import { getAllBundleStats, getOversizedBundles } from "@/lib/bundle-monitor";
import { getErrorLogs } from "@/lib/error-logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check environment integrations
    const missingEnvVars: string[] = [];
    
    // Check critical environment variables
    const criticalVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_KEY',
      'NEXT_PUBLIC_APP_URL',
    ];
    
    criticalVars.forEach(varName => {
      if (!process.env[varName]) {
        missingEnvVars.push(varName);
      }
    });
    
    const envCheck = {
      ok: missingEnvVars.length === 0,
      missing: missingEnvVars,
      warnings: [],
    };
    
    const integrationStatus = getIntegrationEnvStatus(envCheck);

    // Check Redis circuit breaker
    const circuitState = getCircuitState();

    // Get performance metrics
    const dedupStats = getDedupStats();
    const cachePerformance = getOverallCachePerformance();
    const queryStats = getQueryStats();
    const bundleStats = getAllBundleStats();
    const oversizedBundles = getOversizedBundles();
    const recentErrors = getErrorLogs(10, 'high');

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime_ms: process.uptime() * 1000,
      response_time_ms: Date.now() - startTime,
      environment: process.env.NODE_ENV || "unknown",
      integrations: integrationStatus,
      rate_limiter: {
        circuit_state: circuitState,
      },
      memory: {
        used_mb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total_mb: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
      performance: {
        request_deduplication: {
          pending_requests: dedupStats.pendingRequests,
        },
        cache: {
          total_requests: cachePerformance.totalRequests,
          hit_rate: cachePerformance.overallHitRate,
          total_hits: cachePerformance.totalHits,
          total_misses: cachePerformance.totalMisses,
        },
        database: {
          total_queries: queryStats.totalQueries,
          avg_duration_ms: queryStats.avgDuration,
          slow_queries: queryStats.slowQueries,
          slow_query_rate: queryStats.slowQueryRate,
        },
        bundles: {
          total_bundles: Object.keys(bundleStats).length,
          oversized_count: oversizedBundles.length,
        },
      },
      errors: {
        recent_high_severity: recentErrors.length,
      },
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[Health Check] Error:", error);
    
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
