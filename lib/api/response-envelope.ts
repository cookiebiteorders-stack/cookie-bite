/**
 * Standard API Response Envelope
 * 
 * This module provides a standardized response structure for all API endpoints.
 * It ensures consistent error handling, success responses, and metadata across the API.
 * 
 * Response Structure:
 * {
 *   success: boolean;
 *   data?: T;
 *   error?: {
 *     code: string;
 *     message: string;
 *     message_ar?: string;
 *     details?: Record<string, unknown>;
 *   };
 *   meta?: {
 *     timestamp: string;
 *     requestId?: string;
 *     version?: string;
 *   };
 * }
 */

import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
  message_ar?: string;
  details?: Record<string, unknown>;
};

export type ApiResponseMeta = {
  timestamp: string;
  requestId?: string;
  version?: string;
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiResponseMeta;
};

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  meta?: Partial<ApiResponseMeta>,
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Create an error API response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  message_ar?: string,
  details?: Record<string, unknown>,
  meta?: Partial<ApiResponseMeta>,
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      message_ar,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return NextResponse.json(response, { status });
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",
  RESOURCE_LOCKED: "RESOURCE_LOCKED",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Business Logic
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS",
  INVALID_PROMO_CODE: "INVALID_PROMO_CODE",
  PROMO_EXPIRED: "PROMO_EXPIRED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  REFUND_FAILED: "REFUND_FAILED",
  ORDER_CANNOT_BE_REFUNDED: "ORDER_CANNOT_BE_REFUNDED",

  // System
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

/**
 * Helper functions for common error responses
 */
export const responses = {
  unauthorized: (message: string = "Authentication required", message_ar?: string) =>
    errorResponse(ErrorCodes.UNAUTHORIZED, message, 401, message_ar),

  forbidden: (message: string = "Access denied", message_ar?: string) =>
    errorResponse(ErrorCodes.FORBIDDEN, message, 403, message_ar),

  notFound: (resource: string = "Resource", message_ar?: string) =>
    errorResponse(ErrorCodes.NOT_FOUND, `${resource} not found`, 404, message_ar),

  validationError: (message: string = "Validation failed", message_ar?: string, details?: Record<string, unknown>) =>
    errorResponse(ErrorCodes.VALIDATION_ERROR, message, 400, message_ar, details),

  rateLimitExceeded: (message: string = "Too many requests", message_ar?: string) =>
    errorResponse(ErrorCodes.RATE_LIMIT_EXCEEDED, message, 429, message_ar),

  internalError: (message: string = "Internal server error", message_ar?: string) =>
    errorResponse(ErrorCodes.INTERNAL_ERROR, message, 500, message_ar),

  serviceUnavailable: (message: string = "Service temporarily unavailable", message_ar?: string) =>
    errorResponse(ErrorCodes.SERVICE_UNAVAILABLE, message, 503, message_ar),

  insufficientStock: (message: string = "Insufficient stock", message_ar?: string) =>
    errorResponse(ErrorCodes.INSUFFICIENT_STOCK, message, 400, message_ar),

  paymentFailed: (message: string = "Payment failed", message_ar?: string, details?: Record<string, unknown>) =>
    errorResponse(ErrorCodes.PAYMENT_FAILED, message, 502, message_ar, details),

  refundFailed: (message: string = "Refund failed", message_ar?: string, details?: Record<string, unknown>) =>
    errorResponse(ErrorCodes.REFUND_FAILED, message, 502, message_ar, details),
};

/**
 * Bilingual error helper (for backward compatibility)
 */
export function bilingualError(message: string, message_ar: string): { error: { en: string; ar: string } } {
  return {
    error: {
      en: message,
      ar: message_ar,
    },
  };
}

/**
 * Convert bilingual error to standard API error response
 */
export function bilingualErrorResponse(
  message: string,
  message_ar: string,
  code: string = ErrorCodes.VALIDATION_ERROR,
  status: number = 400,
): NextResponse<ApiResponse> {
  return errorResponse(code, message, status, message_ar);
}
