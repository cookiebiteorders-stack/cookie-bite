"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { AuthButton } from "@/components/auth/auth-button";
import { useLanguage } from "@/components/providers/language-provider";
import { Mail, Lock, Chrome, Facebook, X } from "lucide-react";

type SupabaseSignInFormProps = {
  afterAuth: string;
};

export function SupabaseSignInForm({ afterAuth }: SupabaseSignInFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isRTL = lang === "ar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check if Supabase environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError("Supabase configuration is missing. Please contact support.");
        console.error("Missing Supabase environment variables");
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Provide more helpful error messages
        if (signInError.message === "Invalid login credentials") {
          setError("Invalid email or password. Please check your credentials or reset your password.");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Please confirm your email address before signing in.");
        } else {
          setError(signInError.message);
        }
        return;
      }

      // Redirect to afterAuth
      router.push(afterAuth);
      router.refresh();
    } catch (err) {
      setError("Connection error. Please check your internet and try again.");
      console.error("Sign in error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider: 'google' | 'facebook' | 'twitter') => {
    setError(null);
    setSocialLoading(provider);

    try {
      // Check if Supabase environment variables are set
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setError("Supabase configuration is missing. Please contact support.");
        console.error("Missing Supabase environment variables");
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { error: socialError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        },
      });

      if (socialError) {
        // Provide more helpful error messages for OAuth
        if (socialError.message.includes("not enabled")) {
          setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured. Please use email/password or contact support.`);
        } else {
          setError(socialError.message);
        }
        return;
      }
    } catch (err) {
      setError(`Connection error. Please check your internet and try again.`);
      console.error("Social sign in error", err);
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
          <Lock className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={isRTL ? "كلمة المرور" : "Password"}
            autoComplete="current-password"
            className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-cb-brand-500 focus:outline-none focus:ring-2 focus:ring-cb-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-cb-brand-400 dark:focus:ring-cb-brand-400/20 ${isRTL ? 'pr-12' : 'pl-12'}`}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-cb-brand-600 focus:ring-cb-brand-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-cb-brand-400"
            />
            {isRTL ? "تذكرني" : "Remember me"}
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-cb-brand-600 hover:text-cb-brand-700 dark:text-cb-brand-400 dark:hover:text-cb-brand-300"
          >
            {isRTL ? "نسيت كلمة المرور؟" : "Forgot password?"}
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <AuthButton type="submit" loading={loading} className="w-full">
          {isRTL ? "تسجيل الدخول" : "Sign In"}
        </AuthButton>
      </form>
    </div>
  );
}
