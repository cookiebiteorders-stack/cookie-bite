"use client";

import { Suspense } from "react";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { TrackerProvider } from "./TrackerProvider";

/**
 * Client-only wrapper that attaches the Supabase user id to the tracker.
 *
 * Kept separate from the layout so the layout itself remains a Server
 * Component and Supabase's `useSupabaseAuth` is only loaded when the tracker mounts.
 */
function TrackerWithUser() {
  const { userId } = useSupabaseAuth();
  const disabled = process.env.NEXT_PUBLIC_DISABLE_TRACKING === "1";
  const enableReplay =
    !disabled && process.env.NEXT_PUBLIC_TRACKING_ENABLE_REPLAY !== "0";
  return (
    <TrackerProvider
      userId={userId ?? null}
      token={process.env.NEXT_PUBLIC_TRACKING_TOKEN}
      disabled={disabled}
      enableReplay={enableReplay}
    />
  );
}

export function TrackerBootstrap() {
  return (
    <Suspense fallback={null}>
      <TrackerWithUser />
    </Suspense>
  );
}
