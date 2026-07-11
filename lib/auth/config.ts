/**
 * Centralized authentication configuration
 * Single source of truth for auth-related settings
 */

export const AUTH_CONFIG = {
  // Session settings
  SESSION_TIMEOUT_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  REMEMBER_ME_DURATION_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  
  // Rate limiting
  RATE_LIMITS: {
    SIGN_IN: { max: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
    SIGN_UP: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
    PASSWORD_RESET: { max: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour
    OAUTH: { max: 10, windowMs: 60 * 60 * 1000 }, // 10 per hour
  },
  
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: false,
    REQUIRE_LOWERCASE: false,
    REQUIRE_NUMBER: false,
    REQUIRE_SPECIAL: false,
  },
  
  // OAuth settings
  OAUTH: {
    PROVIDERS: ['google', 'facebook', 'twitter'] as const,
    REDIRECT_URL: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/callback`,
  },
  
  // Email verification
  EMAIL_VERIFICATION: {
    REQUIRED: false, // Set to true to enforce email verification
    RESEND_COOLDOWN_MS: 60 * 1000, // 1 minute
  },
  
  // Account lockout
  ACCOUNT_LOCKOUT: {
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  },
} as const;

export type AuthProvider = typeof AUTH_CONFIG.OAUTH.PROVIDERS[number];
