/**
 * Request ID Middleware for Distributed Tracing
 * 
 * This module provides utilities for generating and tracking request IDs
 * across the application for distributed tracing and debugging.
 * 
 * Request IDs help:
 * - Trace requests across multiple services
 * - Debug issues in production by correlating logs
 * - Monitor performance across distributed systems
 */

import { randomBytes } from 'crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_LENGTH = 16;

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return randomBytes(REQUEST_ID_LENGTH).toString('hex');
}

/**
 * Extract or generate a request ID from headers
 */
export function getRequestId(headers: Headers): string {
  const existingId = headers.get(REQUEST_ID_HEADER);
  if (existingId && existingId.length > 0) {
    return existingId;
  }
  return generateRequestId();
}

/**
 * Get the request ID header name
 */
export function getRequestIdHeader(): string {
  return REQUEST_ID_HEADER;
}

/**
 * Request ID context for async storage (if needed in future)
 * This can be extended with AsyncLocalStorage for Node.js runtime
 */
export interface RequestContext {
  requestId: string;
  timestamp: number;
  userId?: string;
  path?: string;
}

/**
 * Create a request context object
 */
export function createRequestContext(
  requestId: string,
  path?: string,
  userId?: string,
): RequestContext {
  return {
    requestId,
    timestamp: Date.now(),
    path,
    userId,
  };
}
