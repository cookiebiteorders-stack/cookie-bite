"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getTracker, type Tracker } from "@/lib/tracking-sdk";

export interface TrackerProviderProps {
  /** Disable tracking entirely (useful for previews / staff). */
  disabled?: boolean;
  /** Token sent as `x-tracking-token` header — must match `TRACKING_TOKEN`. */
  token?: string;
  /** Logical user id (e.g. Clerk userId). */
  userId?: string | null;
  /** Enable lightweight session replay. */
  enableReplay?: boolean;
  /** Endpoint override (default /api/track). */
  endpoint?: string;
  children?: React.ReactNode;
}

/**
 * Bootstraps the first-party tracker on the client and emits a `page_view`
 * on every App Router navigation. Place once in the root layout.
 */
export function TrackerProvider({
  disabled,
  token,
  userId,
  enableReplay,
  endpoint,
  children,
}: TrackerProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackerRef = useRef<Tracker | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (disabled) return;
    if (typeof window === "undefined") return;
    if (!trackerRef.current) {
      trackerRef.current = getTracker({
        token,
        userId,
        enableReplay,
        endpoint,
      });
    } else {
      trackerRef.current.setUserId(userId ?? null);
    }
  }, [disabled, token, userId, enableReplay, endpoint]);

  useEffect(() => {
    if (disabled) return;
    const tracker = trackerRef.current;
    if (!tracker) return;
    // The constructor already fires the first page_view for the initial URL;
    // only subsequent navigations need to be tracked here.
    if (!initialised.current) {
      initialised.current = true;
      return;
    }
    tracker.trackPageView();
    // searchParams included so query-string changes also count as page views.
  }, [pathname, searchParams, disabled]);

  return children ?? null;
}
