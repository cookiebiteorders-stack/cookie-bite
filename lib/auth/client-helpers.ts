/**
 * Centralized Supabase client helpers
 * Eliminates duplication of client creation logic
 */

import { createBrowserClient } from "@supabase/ssr";
import type { User, Session } from "@supabase/supabase-js";
import { getAuthError, mapSupabaseError, AuthErrorCode } from "./errors";

/**
 * Get browser Supabase client with error handling
 * Centralized to avoid duplication across components
 */
export function getBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anon) {
    throw getAuthError(AuthErrorCode.CONFIGURATION_ERROR);
  }
  
  return createBrowserClient(url, anon);
}

/**
 * Get current user with error handling
 */
export async function getCurrentUser(): Promise<{ user: User | null; error: AuthErrorCode | null }> {
  try {
    const supabase = getBrowserClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      return { user: null, error: mapSupabaseError(error) };
    }
    
    return { user, error: null };
  } catch (err) {
    return { user: null, error: AuthErrorCode.NETWORK_ERROR };
  }
}

/**
 * Get current session with error handling
 */
export async function getCurrentSession(): Promise<{ session: Session | null; error: AuthErrorCode | null }> {
  try {
    const supabase = getBrowserClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return { session: null, error: mapSupabaseError(error) };
    }
    
    return { session, error: null };
  } catch (err) {
    return { session: null, error: AuthErrorCode.NETWORK_ERROR };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  try {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });
    
    if (error) {
      return { user: null, session: null, error: mapSupabaseError(error) };
    }
    
    return { user: data.user, session: data.session, error: null };
  } catch (err) {
    return { user: null, session: null, error: AuthErrorCode.NETWORK_ERROR };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(email: string, password: string, metadata?: Record<string, unknown>) {
  try {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: metadata || {},
      },
    });
    
    if (error) {
      return { user: null, session: null, error: mapSupabaseError(error) };
    }
    
    return { user: data.user, session: data.session, error: null };
  } catch (err) {
    return { user: null, session: null, error: AuthErrorCode.NETWORK_ERROR };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  try {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error: mapSupabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: AuthErrorCode.NETWORK_ERROR };
  }
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google', options?: { redirectTo?: string }) {
  try {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: options?.redirectTo || `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    });
    
    if (error) {
      return { error: mapSupabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: AuthErrorCode.NETWORK_ERROR };
  }
}

/**
 * Reset password for email
 */
export async function resetPasswordForEmail(email: string, redirectTo?: string) {
  try {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    
    if (error) {
      return { error: mapSupabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: AuthErrorCode.NETWORK_ERROR };
  }
}

/**
 * Update user password
 */
export async function updatePassword(password: string) {
  try {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.updateUser({
      password,
    });
    
    if (error) {
      return { error: mapSupabaseError(error) };
    }
    
    return { error: null };
  } catch (err) {
    return { error: AuthErrorCode.NETWORK_ERROR };
  }
}
