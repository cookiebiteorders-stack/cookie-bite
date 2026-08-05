/**
 * Request timeout utility
 * Prevents requests from hanging indefinitely
 */

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error(`Request timeout after ${timeoutMs}ms`)
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(timeoutError), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Execute with timeout and fallback
 */
export async function withTimeoutAndFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
  errorMessage: string = `Request timeout after ${timeoutMs}ms, using fallback`
): Promise<T> {
  try {
    return await withTimeout(promise, timeoutMs);
  } catch (error) {
    console.warn(`[request-timeout] ${errorMessage}`, error);
    return fallback;
  }
}

/**
 * Database query timeout wrapper
 */
export async function withDbTimeout<T>(
  query: Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return withTimeout(
    query,
    timeoutMs,
    new Error(`Database query timeout after ${timeoutMs}ms`)
  );
}

/**
 * External API timeout wrapper
 */
export async function withApiTimeout<T>(
  apiCall: Promise<T>,
  timeoutMs: number = 10000
): Promise<T> {
  return withTimeout(
    apiCall,
    timeoutMs,
    new Error(`External API timeout after ${timeoutMs}ms`)
  );
}
