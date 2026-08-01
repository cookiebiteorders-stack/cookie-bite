/**
 * Sentry Integration for Error Tracking and Performance Monitoring
 *
 * This module provides Sentry integration for:
 * - Error tracking and reporting
 * - Performance monitoring
 * - Release tracking
 * - User context
 * - Breadcrumbs for debugging
 *
 * This enables better error visibility and performance insights in production.
 *
 * Note: @sentry/nextjs is not installed. This file provides no-op stubs
 * to prevent build errors. Install @sentry/nextjs to enable Sentry integration.
 */

// Stub implementation since @sentry/nextjs is not installed
const SentryStub = {
  init: (_config: unknown) => console.warn('[Sentry] @sentry/nextjs not installed, skipping initialization'),
  setUser: (_user: unknown) => {},
  addBreadcrumb: (_breadcrumb: unknown) => {},
  captureException: (_error: unknown) => {},
  captureMessage: (_message: unknown, _level?: unknown) => {},
  startTransaction: (_config: unknown) => ({ setStatus: () => {}, finish: () => {} }),
  setTag: (_key: unknown, _value: unknown) => {},
  setExtra: (_key: unknown, _value: unknown) => {},
  setContext: (_key: unknown, _context: unknown) => {},
  setTags: (_tags: unknown) => {},
};

const Sentry = SentryStub;

/**
 * Initialize Sentry with configuration
 */
export function initSentry(): void {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event: unknown, hint: unknown) {
        // Filter out sensitive data
        if (event && typeof event === 'object' && 'request' in event) {
          const request = (event as { request?: { headers?: Record<string, unknown>; query_string?: string } }).request;
          if (request) {
            // Remove sensitive headers
            if (request.headers) {
              delete request.headers['authorization'];
              delete request.headers['cookie'];
              delete request.headers['x-api-key'];
            }
            
            // Remove sensitive query parameters
            if (request.query_string) {
              request.query_string = request.query_string
                .replace(/password=[^&]+/g, 'password=***')
                .replace(/token=[^&]+/g, 'token=***')
                .replace(/api_key=[^&]+/g, 'api_key=***');
            }
          }
        }
        
        return event;
      },
    });
    
    console.log('[Sentry] Initialized');
  } else {
    console.warn('[Sentry] DSN not configured, skipping initialization');
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id?: string;
  email?: string;
  role?: string;
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging context
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  data?: Record<string, unknown>;
}): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>,
  tags?: Record<string, string>,
): void {
  if (context) {
    Sentry.setContext('custom', context);
  }
  
  if (tags) {
    Sentry.setTags(tags);
  }
  
  Sentry.captureException(error);
}

/**
 * Capture a message with level
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: Record<string, unknown>,
): void {
  if (context) {
    Sentry.setContext('custom', context);
  }
  
  Sentry.captureMessage(message, { level });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string): { setStatus: (status: string) => void; finish: () => void } {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Set a tag for filtering
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Set extra context
 */
export function setExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value);
}

/**
 * Performance monitoring wrapper
 */
export async function withPerformanceTracking<T>(
  name: string,
  operation: () => Promise<T>,
  op: string = 'function',
): Promise<T> {
  const transaction = startTransaction(name, op);
  
  try {
    const result = await operation();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureException(error, { transactionName: name });
    throw error;
  } finally {
    transaction.finish();
  }
}
