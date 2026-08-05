/**
 * Request deduplication utility
 * Prevents duplicate identical requests from hitting the database
 * Uses in-memory Map with TTL for simplicity
 */

type PendingRequest = {
  timestamp: number;
  promise: Promise<any>;
};

const pendingRequests = new Map<string, PendingRequest>();
const REQUEST_TTL_MS = 5000; // 5 seconds

/**
 * Deduplicate identical requests by key
 * If the same request is already in progress, return the existing promise
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttlMs: number = REQUEST_TTL_MS
): Promise<T> {
  const now = Date.now();
  
  // Clean up expired entries
  for (const [k, v] of pendingRequests.entries()) {
    if (now - v.timestamp > ttlMs) {
      pendingRequests.delete(k);
    }
  }
  
  // Check if request is already in progress
  const existing = pendingRequests.get(key);
  if (existing && now - existing.timestamp < ttlMs) {
    console.debug(`[request-dedup] Reusing existing request for key: ${key}`);
    return existing.promise as Promise<T>;
  }
  
  // Create new request
  const promise = requestFn();
  pendingRequests.set(key, { timestamp: now, promise });
  
  try {
    const result = await promise;
    return result;
  } finally {
    // Clean up after request completes
    setTimeout(() => {
      pendingRequests.delete(key);
    }, ttlMs);
  }
}

/**
 * Generate a deduplication key from request parameters
 */
export function generateDedupKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('&');
  return `${prefix}:${sorted}`;
}

/**
 * Get current deduplication statistics
 */
export function getDedupStats() {
  return {
    pendingRequests: pendingRequests.size,
    keys: Array.from(pendingRequests.keys()),
  };
}

/**
 * Clear all pending requests (useful for testing)
 */
export function clearDedupCache(): void {
  pendingRequests.clear();
}
