"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { getBrowserClient, getCurrentUser, getCurrentSession, signOut as signOutHelper } from "@/lib/auth/client-helpers";
import { AuthErrorCode, getAuthError } from "@/lib/auth/errors";

type AuthContextType = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  user: User | null;
  session: Session | null;
  error: AuthErrorCode | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoaded: false,
  isSignedIn: false,
  userId: null,
  user: null,
  session: null,
  error: null,
  signOut: async () => {},
  refresh: async () => {},
});

export function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const router = useRouter();

  const refresh = async () => {
    setIsLoaded(false);
    try {
      const { user: currentUser, error: userError } = await getCurrentUser();
      const { session: currentSession, error: sessionError } = await getCurrentSession();
      
      setUser(currentUser);
      setSession(currentSession);
      setError(userError || sessionError);
    } catch (err) {
      console.error("===== AUTH PROVIDER REFRESH ERROR =====");
      console.error(err);
      if (err instanceof Error) {
        console.error(err.stack);
      }
      setError(AuthErrorCode.NETWORK_ERROR);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    refresh().then(() => {
      if (!mounted) return;
    });

    // Listen for auth changes using centralized client
    try {
      const supabase = getBrowserClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        setError(null);
        
        // Sync logout across tabs using localStorage
        if (event === "SIGNED_OUT") {
          localStorage.setItem('auth-signout', Date.now().toString());
          router.refresh();
        } else if (event === "SIGNED_IN") {
          router.refresh();
        } else if (event === "TOKEN_REFRESHED") {
          // Session refreshed, no action needed
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch (err) {
      console.error("===== AUTH PROVIDER INITIALIZATION ERROR =====");
      console.error(err);
      if (err instanceof Error) {
        console.error(err.stack);
      }
      setError(AuthErrorCode.CONFIGURATION_ERROR);
      setIsLoaded(true);
      // Don't crash the app if auth is not configured
      return () => {
        mounted = false;
      };
    }
  }, [router]);

  // Listen for logout from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth-signout') {
        setUser(null);
        setSession(null);
        router.push('/sign-in');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  const signOut = async () => {
    const { error: signOutError } = await signOutHelper();
    
    if (signOutError) {
      setError(signOutError);
      return;
    }
    
    // Notify other tabs
    localStorage.setItem('auth-signout', Date.now().toString());
    
    setUser(null);
    setSession(null);
    setError(null);
    router.push('/');
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        isLoaded,
        isSignedIn: !!user,
        userId: user?.id ?? null,
        user,
        session,
        error,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within a SupabaseAuthProvider");
  }
  return context;
}
