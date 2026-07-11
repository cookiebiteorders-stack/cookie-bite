/**
 * Centralized Supabase server client helpers
 * For use in Server Components, Server Actions, and API routes
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { User, Session } from "@supabase/supabase-js";
import { getAuthError, mapSupabaseError, AuthErrorCode } from "./errors";

/**
 * Get server Supabase client with error handling
 */
export async function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !anon) {
    throw getAuthError(AuthErrorCode.CONFIGURATION_ERROR);
  }
  
  const cookieStore = await cookies();
  
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Ignore if cookies can't be set in this context
        }
      },
    },
  });
}

/**
 * Get current user on server
 */
export async function getServerUser(): Promise<{ user: User | null; error: AuthErrorCode | null }> {
  try {
    const supabase = await getServerClient();
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
 * Get current session on server
 */
export async function getServerSession(): Promise<{ session: Session | null; error: AuthErrorCode | null }> {
  try {
    const supabase = await getServerClient();
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
 * Check if user is authenticated on server
 */
export async function isServerAuthenticated(): Promise<boolean> {
  const { user } = await getServerUser();
  return user !== null;
}

/**
 * Get user ID on server
 */
export async function getServerUserId(): Promise<string | null> {
  const { user } = await getServerUser();
  return user?.id ?? null;
}

/**
 * Get user email on server
 */
export async function getServerUserEmail(): Promise<string | null> {
  const { user } = await getServerUser();
  return user?.email ?? null;
}
