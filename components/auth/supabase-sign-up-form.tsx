"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthButton } from "@/components/auth/auth-button";
import { useLanguage } from "@/components/providers/language-provider";
import { Mail, Lock, User, Phone, Chrome, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { signUpWithEmail, signInWithOAuth } from "@/lib/auth/client-helpers";
import { validateSignUpForm, calculatePasswordStrength, getPasswordStrengthLabel } from "@/lib/auth/validation";
import { getAuthError, AuthErrorCode } from "@/lib/auth/errors";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/auth/rate-limit";

type SupabaseSignUpFormProps = {
  afterAuth: string;
};

export function SupabaseSignUpForm({ afterAuth }: SupabaseSignUpFormProps) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<{ remaining: number; resetAt: number } | null>(null);
  const isRTL = lang === "ar";

  const passwordStrength = calculatePasswordStrength(password);
  const { label: strengthLabel, color: strengthColor } = getPasswordStrengthLabel(passwordStrength);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRateLimitError(null);

    // Validate form
    const validation = validateSignUpForm(email, password, confirmPassword, fullName);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors)[0];
      setError(errorMessage);
      return;
    }

    // Check rate limit
    const rateLimitId = getRateLimitIdentifier('sign-up', email.toLowerCase());
    const rateLimitCheck = checkRateLimit(rateLimitId, 'SIGN_UP');
    
    if (!rateLimitCheck.allowed) {
      setRateLimitError({
        remaining: rateLimitCheck.remaining,
        resetAt: rateLimitCheck.resetAt,
      });
      setError(isRTL ? "محاولات تسجيل كثيرة. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى." : "Too many sign-up attempts. Please wait a few minutes before trying again.");
      return;
    }

    setLoading(true);

    try {
      const { user, session, error: signUpError } = await signUpWithEmail(email, password, {
        full_name: fullName,
        phone: phone || undefined,
      });

      if (signUpError || !user) {
        const authError = getAuthError(signUpError || AuthErrorCode.UNKNOWN_ERROR);
        setError(lang === "ar" ? authError.messageAr : authError.message);
        return;
      }

      window.location.assign(afterAuth);
    } catch (err) {
      const authError = getAuthError(AuthErrorCode.NETWORK_ERROR);
      setError(lang === "ar" ? authError.messageAr : authError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google') => {
    setError(null);
    setRateLimitError(null);
    setSocialLoading(provider);

    // Check rate limit for OAuth
    const rateLimitId = getRateLimitIdentifier('oauth', 'global');
    const rateLimitCheck = checkRateLimit(rateLimitId, 'OAUTH');
    
    if (!rateLimitCheck.allowed) {
      setRateLimitError({
        remaining: rateLimitCheck.remaining,
        resetAt: rateLimitCheck.resetAt,
      });
      setError(isRTL ? "محاولات OAuth كثيرة. يرجى الانتظار بضع دقائق قبل المحاولة مرة أخرى." : "Too many OAuth attempts. Please wait a few minutes before trying again.");
      setSocialLoading(null);
      return;
    }

    try {
      const { error: oauthError } = await signInWithOAuth(provider);

      if (oauthError) {
        const authError = getAuthError(oauthError);
        setError(lang === "ar" ? authError.messageAr : authError.message);
        return;
      }
    } catch (err) {
      const authError = getAuthError(AuthErrorCode.NETWORK_ERROR);
      setError(lang === "ar" ? authError.messageAr : authError.message);
    } finally {
      setSocialLoading(null);
    }
  };

  const formatResetTime = (resetAt: number) => {
    const seconds = Math.ceil((resetAt - Date.now()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Social Auth Buttons */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => handleSocialSignIn('google')}
          disabled={socialLoading !== null}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-300"
        >
          {socialLoading === 'google' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <Chrome className="h-4 w-4 flex-shrink-0" />
          )}
          <span>Sign up with Google</span>
        </button>
      </div>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        <span className="mx-3 text-xs text-gray-500 dark:text-gray-400">{isRTL ? "أو" : "or"}</span>
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      </div>

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="relative group">
          <User className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-cb-brand-500 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder={isRTL ? "الاسم الكامل" : "Full Name"}
            autoComplete="name"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="relative group">
          <Mail className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-cb-brand-500 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={isRTL ? "البريد الإلكتروني" : "Email Address"}
            autoComplete="email"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="relative group">
          <Phone className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-cb-brand-500 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={isRTL ? "رقم الهاتف (اختياري)" : "Phone Number (Optional)"}
            autoComplete="tel"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="relative group">
            <Lock className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-cb-brand-500 ${isRTL ? 'right-4' : 'left-4'}`} />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={isRTL ? "إنشاء كلمة المرور" : "Create Password"}
              autoComplete="new-password"
              className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12 pl-12' : 'pl-12 pr-12'}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none ${isRTL ? 'left-3' : 'right-3'}`}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          
          {password.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-1 mt-1 px-1"
            >
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${passwordStrength}%` }}
                  className={`h-full transition-colors duration-300 ${strengthColor}`}
                />
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className={`font-medium ${strengthColor}`}>
                  {strengthLabel}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {isRTL ? "8 أحرف على الأقل" : "Min 8 chars"}
                </span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="relative group">
          <Lock className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-cb-brand-500 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder={isRTL ? "تأكيد كلمة المرور" : "Confirm Password"}
            autoComplete="new-password"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer mt-2">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cb-brand-600 focus:ring-cb-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-cb-brand-400"
          />
          <span>
            {isRTL ? (
              <>
                أوافق على <a href="/terms" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400 font-medium">الشروط والأحكام</a> و <a href="/privacy" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400 font-medium">سياسة الخصوصية</a>
              </>
            ) : (
              <>
                I agree to the <a href="/terms" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400 font-medium">Terms of Service</a> and <a href="/privacy" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400 font-medium">Privacy Policy</a>
              </>
            )}
          </span>
        </label>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300 shadow-sm"
              role="alert"
            >
              {error}
              {rateLimitError && (
                <p className="mt-1 text-xs opacity-90">
                  {isRTL ? "حاول مرة أخرى في" : "Try again in"} {formatResetTime(rateLimitError.resetAt)}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AuthButton type="submit" loading={loading} className="w-full mt-1">
          {isRTL ? "إنشاء حساب" : "Create Account"}
        </AuthButton>
      </form>
    </div>
  );
}
