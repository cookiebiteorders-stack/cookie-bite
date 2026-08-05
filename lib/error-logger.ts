/**
 * Simple error logging utility
 * In production, this should be integrated with a service like Sentry
 */

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorLog {
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  path?: string;
}

const errorLogs: ErrorLog[] = [];
const MAX_LOGS = 1000; // Keep last 1000 errors in memory

/**
 * Log an error with context
 */
export function logError(error: Error | string, context?: Record<string, unknown>, severity: ErrorSeverity = 'medium'): void {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    severity,
    message: typeof error === 'string' ? error : error.message,
    context,
    stack: typeof error === 'object' ? error.stack : undefined,
  };

  // Add to in-memory logs
  errorLogs.push(errorLog);
  
  // Keep only last MAX_LOGS
  if (errorLogs.length > MAX_LOGS) {
    errorLogs.shift();
  }

  // Console output based on severity
  const consoleMethod = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  console[consoleMethod](`[${severity.toUpperCase()}]`, errorLog.message, context || '');
}

/**
 * Get recent error logs
 */
export function getErrorLogs(limit: number = 50, severity?: ErrorSeverity): ErrorLog[] {
  let logs = [...errorLogs].reverse();
  
  if (severity) {
    logs = logs.filter(log => log.severity === severity);
  }
  
  return logs.slice(0, limit);
}

/**
 * Clear error logs
 */
export function clearErrorLogs(): void {
  errorLogs.length = 0;
}

/**
 * Log a critical error (highest severity)
 */
export function logCriticalError(error: Error | string, context?: Record<string, unknown>): void {
  logError(error, context, 'critical');
}

/**
 * Log a warning (low severity)
 */
export function logWarning(message: string, context?: Record<string, unknown>): void {
  logError(message, context, 'low');
}
