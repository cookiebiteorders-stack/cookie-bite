"use client";

import { Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { TrackerProvider } from "./TrackerProvider";

/**
 * Client-only wrapper that attaches the Clerk user id to the tracker.
 *
 * Kept separate from the layout so the layout itself remains a Server
 * Component and Clerk's `useAuth` is only loaded when the tracker mounts.
 */
function TrackerWithUser() {
  const { userId } = useAuth();
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
