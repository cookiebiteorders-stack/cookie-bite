/**
 * Unified Auth Module
 * 
 * This module consolidates all authentication-related functionality into a single,
 * standardized interface. It provides:
 * - User authentication and session management
 * - Authorization helpers
 * - Rate limiting for auth operations
 * - Safe redirects
 * - Error handling
 * 
 * This replaces the scattered auth helpers with a cohesive, maintainable API.
 */

export { auth, currentUser, getUserId, isAuthenticated } from "./supabase-auth";
export type { AuthResult } from "./supabase-auth";

export { requireAuth, requireAdminAuth, requireStaffAuth } from "./require-auth";
export { safeAuthRedirectPath } from "./safe-redirect";
export { checkRateLimit } from "./rate-limit";
export type { AuthError, AuthErrorCode } from "./errors";
export { AuthenticationError, AuthorizationError } from "./errors";
export { AUTH_CONFIG } from "./config";
export type { AuthProvider } from "./config";

// Re-export client and server helpers for backward compatibility
export { getBrowserClient } from "./client-helpers";
export { getServerClient } from "./server-helpers";
export { getCurrentProfile, requireCurrentProfile } from "./get-profile";
export { validateEmail, validatePassword } from "./validation";
export { verifyInternalSecret } from "./verify-internal";
export { requireInternalSecret } from "./require-internal-secret";
