/**
 * Centralized authentication error handling
 * Consistent error messages and error types
 */

export enum AuthErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Sign in errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_CONFIRMED = 'EMAIL_NOT_CONFIRMED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
  
  // Sign up errors
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  WEAK_PASSWORD = 'WEAK_PASSWORD',
  PASSWORDS_DO_NOT_MATCH = 'PASSWORDS_DO_NOT_MATCH',
  INVALID_EMAIL = 'INVALID_EMAIL',
  
  // Password reset errors
  INVALID_RESET_TOKEN = 'INVALID_RESET_TOKEN',
  EXPIRED_RESET_TOKEN = 'EXPIRED_RESET_TOKEN',
  RESET_TOKEN_USED = 'RESET_TOKEN_USED',
  
  // OAuth errors
  OAUTH_CANCELLED = 'OAUTH_CANCELLED',
  OAUTH_FAILED = 'OAUTH_FAILED',
  OAUTH_NOT_CONFIGURED = 'OAUTH_NOT_CONFIGURED',
  ACCOUNT_ALREADY_LINKED = 'ACCOUNT_ALREADY_LINKED',
  
  // Session errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  
  // Authorization errors
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  ADMIN_ACCESS_REQUIRED = 'ADMIN_ACCESS_REQUIRED',
  STAFF_ACCESS_REQUIRED = 'STAFF_ACCESS_REQUIRED',
}

export type AuthError = {
  code: AuthErrorCode;
  message: string;
  messageAr: string;
  details?: unknown;
};

export class AuthenticationError extends Error {
  code: AuthErrorCode;
  
  constructor(message: string, code: AuthErrorCode = AuthErrorCode.AUTHENTICATION_REQUIRED) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export class AuthorizationError extends Error {
  code: AuthErrorCode;
  
  constructor(message: string, code: AuthErrorCode = AuthErrorCode.ADMIN_ACCESS_REQUIRED) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

const errorMessages: Record<AuthErrorCode, { en: string; ar: string }> = {
  [AuthErrorCode.UNKNOWN_ERROR]: {
    en: 'An unexpected error occurred. Please try again.',
    ar: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
  },
  [AuthErrorCode.NETWORK_ERROR]: {
    en: 'Connection error. Please check your internet and try again.',
    ar: 'خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.',
  },
  [AuthErrorCode.CONFIGURATION_ERROR]: {
    en: 'Authentication service is not configured. Please contact support.',
    ar: 'خدمة المصادقة غير مهيأة. يرجى الاتصال بالدعم.',
  },
  [AuthErrorCode.INVALID_CREDENTIALS]: {
    en: 'Invalid email or password. Please check your credentials.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق من بياناتك.',
  },
  [AuthErrorCode.EMAIL_NOT_CONFIRMED]: {
    en: 'Please confirm your email address before signing in.',
    ar: 'يرجى تأكيد عنوان بريدك الإلكتروني قبل تسجيل الدخول.',
  },
  [AuthErrorCode.ACCOUNT_LOCKED]: {
    en: 'Your account has been locked due to too many failed attempts. Please try again later.',
    ar: 'تم قفل حسابك بسبب محاولات فاشلة كثيرة. يرجى المحاولة مرة أخرى لاحقاً.',
  },
  [AuthErrorCode.TOO_MANY_ATTEMPTS]: {
    en: 'Too many attempts. Please wait a few minutes before trying again.',
    ar: 'محاولات كثيرة جداً. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى.',
  },
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: {
    en: 'An account with this email already exists. Please sign in instead.',
    ar: 'يوجد حساب بالفعل باستخدام هذا البريد الإلكتروني. يرجى تسجيل الدخول بدلاً من ذلك.',
  },
  [AuthErrorCode.WEAK_PASSWORD]: {
    en: 'Password is too weak. Please use a stronger password.',
    ar: 'كلمة المرور ضعيفة جداً. يرجى استخدام كلمة مرور أقوى.',
  },
  [AuthErrorCode.PASSWORDS_DO_NOT_MATCH]: {
    en: 'Passwords do not match.',
    ar: 'كلمات المرور غير متطابقة.',
  },
  [AuthErrorCode.INVALID_EMAIL]: {
    en: 'Please enter a valid email address.',
    ar: 'يرجى إدخال عنوان بريد إلكتروني صحيح.',
  },
  [AuthErrorCode.INVALID_RESET_TOKEN]: {
    en: 'Invalid password reset link. Please request a new one.',
    ar: 'رابط إعادة تعيين كلمة المرور غير صالح. يرجى طلب رابط جديد.',
  },
  [AuthErrorCode.EXPIRED_RESET_TOKEN]: {
    en: 'Password reset link has expired. Please request a new one.',
    ar: 'رابط إعادة تعيين كلمة المرور منتهي الصلاحية. يرجى طلب رابط جديد.',
  },
  [AuthErrorCode.RESET_TOKEN_USED]: {
    en: 'This password reset link has already been used. Please request a new one.',
    ar: 'تم استخدام رابط إعادة تعيين كلمة المرور بالفعل. يرجى طلب رابط جديد.',
  },
  [AuthErrorCode.OAUTH_CANCELLED]: {
    en: 'Sign in was cancelled. Please try again.',
    ar: 'تم إلغاء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
  },
  [AuthErrorCode.OAUTH_FAILED]: {
    en: 'Sign in failed. Please try again or use a different method.',
    ar: 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى أو استخدام طريقة مختلفة.',
  },
  [AuthErrorCode.OAUTH_NOT_CONFIGURED]: {
    en: 'This sign-in method is not configured. Please use email/password or contact support.',
    ar: 'طريقة تسجيل الدخول هذه غير مهيأة. يرجى استخدام البريد الإلكتروني/كلمة المرور أو الاتصال بالدعم.',
  },
  [AuthErrorCode.ACCOUNT_ALREADY_LINKED]: {
    en: 'This account is already linked to another user.',
    ar: 'هذا الحساب مرتبط بالفعل بمستخدم آخر.',
  },
  [AuthErrorCode.SESSION_EXPIRED]: {
    en: 'Your session has expired. Please sign in again.',
    ar: 'انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.',
  },
  [AuthErrorCode.SESSION_INVALID]: {
    en: 'Your session is invalid. Please sign in again.',
    ar: 'جلستك غير صالحة. yرجى تسجيل الدخول مرة أخرى.',
  },
  [AuthErrorCode.AUTHENTICATION_REQUIRED]: {
    en: 'Authentication required. Please sign in.',
    ar: 'مطلوب تسجيل الدخول. يرجى تسجيل الدخول.',
  },
  [AuthErrorCode.ADMIN_ACCESS_REQUIRED]: {
    en: 'Admin access required.',
    ar: 'مطلوب صلاحيات المسؤول.',
  },
  [AuthErrorCode.STAFF_ACCESS_REQUIRED]: {
    en: 'Staff access required.',
    ar: 'مطلوب صلاحيات الموظفين.',
  },
};

export function getAuthError(code: AuthErrorCode, details?: unknown): AuthError {
  const messages = errorMessages[code] || errorMessages[AuthErrorCode.UNKNOWN_ERROR];
  return {
    code,
    message: messages.en,
    messageAr: messages.ar,
    details,
  };
}

export function mapSupabaseError(error: { message?: string }): AuthErrorCode {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('invalid login credentials')) {
    return AuthErrorCode.INVALID_CREDENTIALS;
  }
  if (message.includes('email not confirmed')) {
    return AuthErrorCode.EMAIL_NOT_CONFIRMED;
  }
  if (message.includes('user already registered')) {
    return AuthErrorCode.EMAIL_ALREADY_EXISTS;
  }
  if (message.includes('password should be')) {
    return AuthErrorCode.WEAK_PASSWORD;
  }
  if (message.includes('same as old password')) {
    return AuthErrorCode.WEAK_PASSWORD;
  }
  
  return AuthErrorCode.UNKNOWN_ERROR;
}
