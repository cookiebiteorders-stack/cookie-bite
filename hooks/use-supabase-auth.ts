"use client";

import { useAuth } from "@/components/providers/auth-provider";

export function useSupabaseAuth() {
  return useAuth();
}
