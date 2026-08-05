/**
 * CSRF Protection Module
 * 
 * This module provides CSRF (Cross-Site Request Forgery) protection for state-changing operations.
 * 
 * CSRF protection works by:
 * 1. Generating a random token for each session
 * 2. Including the token in forms and API requests
 * 3. Validating the token on state-changing operations (POST, PUT, PATCH, DELETE)
 * 
 * The token is stored in a cookie with SameSite=Strict to prevent cross-site requests.
 */

import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const TOKEN_LENGTH = 32;

/**
 * Generate a random CSRF token
 */
function generateToken(): string {
  return randomBytes(TOKEN_LENGTH).toString('hex');
}

/**
 * Hash a token for secure comparison
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Get or create a CSRF token for the current session
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME);

  if (existingToken) {
    return existingToken.value;
  }

  // Generate new token
  const newToken = generateToken();
  cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value: newToken,
    httpOnly: process.env.NODE_ENV === 'production', // Allow JS access in dev
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return newToken;
}

/**
 * Validate a CSRF token from the request
 * 
 * The token can be provided via:
 * - x-csrf-token header
 * - csrf_token form field
 * - _csrf query parameter (for GET requests that initiate state changes)
 */
export async function validateCsrfToken(
  providedToken?: string | null,
): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME);

  if (!cookieToken) {
    // No token in cookie - this might be a first-time request
    // In production, you might want to be stricter
    return process.env.NODE_ENV !== 'production';
  }

  if (!providedToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  const expected = cookieToken.value;
  const actual = providedToken;

  if (expected.length !== actual.length) {
    return false;
  }

  // Use timing-safe comparison
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  
  let result = 0;
  for (let i = 0; i < expectedBuffer.length; i++) {
    result |= expectedBuffer[i] ^ actualBuffer[i];
  }

  return result === 0;
}

/**
 * Extract CSRF token from request headers or body
 */
export function extractCsrfToken(request: Request): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // For form submissions, the token might be in the body
  // This is handled by the route handler parsing the body
  return null;
}

/**
 * Middleware helper to validate CSRF for state-changing operations
 */
export async function requireCsrfProtection(request: Request): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Skip CSRF for GET, HEAD, OPTIONS requests (they should be idempotent)
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return { valid: true };
  }

  // For state-changing methods, validate CSRF
  const token = extractCsrfToken(request);
  const isValid = await validateCsrfToken(token);

  if (!isValid) {
    return {
      valid: false,
      error: 'Invalid or missing CSRF token',
    };
  }

  return { valid: true };
}

/**
 * Get CSRF token for client-side use
 * This should be called in server components or route handlers
 */
export async function getCsrfTokenForClient(): Promise<{
  token: string;
  headerName: string;
}> {
  const token = await getCsrfToken();
  return {
    token,
    headerName: CSRF_HEADER_NAME,
  };
}
