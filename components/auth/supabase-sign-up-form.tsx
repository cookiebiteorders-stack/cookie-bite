"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { AuthButton } from "@/components/auth/auth-button";
import { useLanguage } from "@/components/providers/language-provider";
import { Mail, Lock, User, Chrome, Facebook, X } from "lucide-react";

type SupabaseSignUpFormProps = {
  afterAuth: string;
};

export function SupabaseSignUpForm({ afterAuth }: SupabaseSignUpFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRTL = lang === "ar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
          emailRedirectTo: `${window.location.origin}${afterAuth}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        // Create user profile in database
        const response = await fetch("/api/account/provision", {
          method: "POST",
        });
        
        if (!response.ok) {
          console.error("Failed to provision user profile");
        }

        // Redirect to afterAuth or account completion
        router.push(afterAuth);
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Sign up error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter') => {
    setError(null);
    setSocialLoading(provider);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error: socialError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (socialError) {
        setError(socialError.message);
        return;
      }
    } catch (err) {
      setError(`Failed to sign up with ${provider}. Please try again.`);
      console.error("Social sign up error", err);
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Social Auth Buttons - Horizontal */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleSocialSignIn('google')}
          disabled={socialLoading !== null}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-300"
        >
          {socialLoading === 'google' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <Chrome className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="hidden sm:inline leading-tight">Google</span>
        </button>
        
        <button
          type="button"
          onClick={() => handleSocialSignIn('facebook')}
          disabled={socialLoading !== null}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-300"
        >
          {socialLoading === 'facebook' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <Facebook className="h-4 w-4 flex-shrink-0 text-blue-600" />
          )}
          <span className="hidden sm:inline leading-tight">Facebook</span>
        </button>

        <button
          type="button"
          onClick={() => handleSocialSignIn('twitter')}
          disabled={socialLoading !== null}
          className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-medium text-gray-500 transition-all hover:bg-gray-50 hover:border-gray-300 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:hover:text-gray-300"
        >
          {socialLoading === 'twitter' ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          ) : (
            <X className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="hidden sm:inline leading-tight">X</span>
        </button>
      </div>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        <span className="mx-3 text-xs text-gray-500 dark:text-gray-400">or</span>
        <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" dir={isRTL ? "rtl" : "ltr"}>
        <div className="relative">
          <User className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder={isRTL ? "الاسم الكامل" : "Full Name"}
            autoComplete="name"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="relative">
          <Mail className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={isRTL ? "البريد الإلكتروني" : "Email Address"}
            autoComplete="email"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="relative">
          <Mail className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={isRTL ? "رقم الهاتف (اختياري)" : "Phone Number (Optional)"}
            autoComplete="tel"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="relative">
          <Lock className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={isRTL ? "إنشاء كلمة المرور" : "Create Password"}
            autoComplete="new-password"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {isRTL ? (
            <p>كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل</p>
          ) : (
            <p>Password must be at least 8 characters long</p>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cb-brand-600 focus:ring-cb-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-cb-brand-400"
          />
          <span>
            {isRTL ? (
              <>
                أوافق على <a href="/terms" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400">الشروط والأحكام</a> و <a href="/privacy" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400">سياسة الخصوصية</a>
              </>
            ) : (
              <>
                I agree to the <a href="/terms" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400">Terms of Service</a> and <a href="/privacy" className="text-cb-brand-600 hover:underline dark:text-cb-brand-400">Privacy Policy</a>
              </>
            )}
          </span>
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <AuthButton type="submit" loading={loading} className="w-full">
          {isRTL ? "إنشاء حساب" : "Create Account"}
        </AuthButton>
      </form>
    </div>
  );
}
