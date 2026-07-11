/**
 * Authentication validation utilities
 * Centralized validation logic for auth forms
 */

import { AUTH_CONFIG } from "./config";
import { AuthErrorCode, getAuthError } from "./errors";

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < AUTH_CONFIG.PASSWORD.MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${AUTH_CONFIG.PASSWORD.MIN_LENGTH} characters long` 
    };
  }
  
  if (AUTH_CONFIG.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }
  
  if (AUTH_CONFIG.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }
  
  if (AUTH_CONFIG.PASSWORD.REQUIRE_NUMBER && !/\d/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }
  
  if (AUTH_CONFIG.PASSWORD.REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }
  
  return { isValid: true };
}

/**
 * Validate password confirmation
 */
export function validatePasswordMatch(password: string, confirmPassword: string): { isValid: boolean; error?: string } {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  
  return { isValid: true };
}

/**
 * Validate sign-in form
 */
export function validateSignInForm(email: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }
  
  if (!password || password.length === 0) {
    errors.password = 'Password is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate sign-up form
 */
export function validateSignUpForm(
  email: string,
  password: string,
  confirmPassword: string,
  fullName?: string
): ValidationResult {
  const errors: Record<string, string> = {};
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  }
  
  const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
  if (!passwordMatchValidation.isValid) {
    errors.confirmPassword = passwordMatchValidation.error!;
  }
  
  if (fullName && fullName.trim().length === 0) {
    errors.fullName = 'Name cannot be empty';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate forgot password form
 */
export function validateForgotPasswordForm(email: string): ValidationResult {
  const errors: Record<string, string> = {};
  
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate reset password form
 */
export function validateResetPasswordForm(password: string, confirmPassword: string): ValidationResult {
  const errors: Record<string, string> = {};
  
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!;
  }
  
  const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
  if (!passwordMatchValidation.isValid) {
    errors.confirmPassword = passwordMatchValidation.error!;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculate password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  let score = 0;
  
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
  
  if (password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)) {
    score += 20;
  }
  
  return Math.min(score, 100);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): { label: string; color: string } {
  if (score < 30) return { label: 'Weak', color: 'text-red-500' };
  if (score < 50) return { label: 'Fair', color: 'text-orange-500' };
  if (score < 70) return { label: 'Good', color: 'text-yellow-500' };
  if (score < 90) return { label: 'Strong', color: 'text-green-500' };
  return { label: 'Very Strong', color: 'text-emerald-500' };
}
