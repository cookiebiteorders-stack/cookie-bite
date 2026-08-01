/**
 * Structured Logging with Request Correlation IDs
 * 
 * This module provides structured logging capabilities with:
 * - Request correlation IDs for tracing requests across the system
 * - Structured log levels (debug, info, warn, error)
 * - Contextual metadata attachment
 * - Consistent log format for parsing and analysis
 * 
 * This enables better observability and debugging in production.
 */

import { randomUUID } from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  context?: LogContext;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  };
};

/**
 * Generate a unique correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Extract or generate correlation ID from request headers
 */
export function getCorrelationId(headers: Headers): string {
  const existing = headers.get('x-correlation-id') || headers.get('x-request-id');
  if (existing) {
    return existing;
  }
  return generateCorrelationId();
}

/**
 * Structured logger class
 */
export class StructuredLogger {
  private context: LogContext = {};
  private correlationId?: string;
  private userId?: string;

  constructor(options?: {
    correlationId?: string;
    userId?: string;
    context?: LogContext;
  }) {
    this.correlationId = options?.correlationId;
    this.userId = options?.userId;
    this.context = options?.context || {};
  }

  /**
   * Add context to all subsequent log entries
   */
  withContext(additionalContext: LogContext): StructuredLogger {
    return new StructuredLogger({
      correlationId: this.correlationId,
      userId: this.userId,
      context: { ...this.context, ...additionalContext },
    });
  }

  /**
   * Set correlation ID
   */
  withCorrelationId(correlationId: string): StructuredLogger {
    return new StructuredLogger({
      correlationId,
      userId: this.userId,
      context: this.context,
    });
  }

  /**
   * Set user ID
   */
  withUserId(userId: string): StructuredLogger {
    return new StructuredLogger({
      correlationId: this.correlationId,
      userId,
      context: this.context,
    });
  }

  /**
   * Create a log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    additionalContext?: LogContext,
    error?: Error,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      userId: this.userId,
      context: { ...this.context, ...additionalContext },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      };
    }

    return entry;
  }

  /**
   * Output log entry (can be overridden for custom destinations)
   */
  private log(entry: LogEntry): void {
    const output = JSON.stringify(entry);
    
    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  /**
   * Debug level log
   */
  debug(message: string, context?: LogContext): void {
    this.log(this.createLogEntry('debug', message, context));
  }

  /**
   * Info level log
   */
  info(message: string, context?: LogContext): void {
    this.log(this.createLogEntry('info', message, context));
  }

  /**
   * Warn level log
   */
  warn(message: string, context?: LogContext): void {
    this.log(this.createLogEntry('warn', message, context));
  }

  /**
   * Error level log
   */
  error(message: string, error?: Error, context?: LogContext): void {
    this.log(this.createLogEntry('error', message, context, error));
  }

  /**
   * Log HTTP request
   */
  logRequest(context: {
    method: string;
    path: string;
    statusCode?: number;
    duration?: number;
    userId?: string;
  }): void {
    this.info('HTTP Request', {
      method: context.method,
      path: context.path,
      statusCode: context.statusCode,
      duration: context.duration,
    });
  }

  /**
   * Log database query
   */
  logQuery(context: {
    table: string;
    operation: 'select' | 'insert' | 'update' | 'delete';
    duration?: number;
    rowCount?: number;
  }): void {
    this.debug('Database Query', {
      table: context.table,
      operation: context.operation,
      duration: context.duration,
      rowCount: context.rowCount,
    });
  }

  /**
   * Log external API call
   */
  logExternalCall(context: {
    service: string;
    endpoint: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    success: boolean;
  }): void {
    const level = context.success ? 'info' : 'error';
    this.log(this.createLogEntry(level, 'External API Call', {
      service: context.service,
      endpoint: context.endpoint,
      method: context.method,
      statusCode: context.statusCode,
      duration: context.duration,
      success: context.success,
    }));
  }
}

/**
 * Default logger instance
 */
export const logger = new StructuredLogger();

/**
 * Create a logger with correlation ID from request
 */
export function createRequestLogger(request: Request): StructuredLogger {
  const correlationId = getCorrelationId(request.headers);
  return new StructuredLogger({ correlationId });
}

/**
 * Middleware to add correlation ID to request context
 */
export function withCorrelationId(handler: (request: Request, context?: { correlationId: string }) => Response) {
  return (request: Request): Response => {
    const correlationId = getCorrelationId(request.headers);
    return handler(request, { correlationId });
  };
}

/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private logger: StructuredLogger;
  private operation: string;

  constructor(operation: string, logger?: StructuredLogger) {
    this.operation = operation;
    this.logger = logger || new StructuredLogger();
    this.startTime = Date.now();
  }

  /**
   * End timing and log the duration
   */
  end(context?: LogContext): number {
    const duration = Date.now() - this.startTime;
    this.logger.debug(this.operation, {
      duration,
      ...context,
    });
    return duration;
  }

  /**
   * End timing and log as info
   */
  endInfo(context?: LogContext): number {
    const duration = Date.now() - this.startTime;
    this.logger.info(this.operation, {
      duration,
      ...context,
    });
    return duration;
  }
}

/**
 * Create a performance timer
 */
export function startTimer(operation: string, logger?: StructuredLogger): PerformanceTimer {
  return new PerformanceTimer(operation, logger);
}
