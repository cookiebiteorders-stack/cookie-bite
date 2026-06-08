"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  getSessionId,
  markAnnouncementClicked,
  markAnnouncementDismissed,
  markAnnouncementSeen,
} from "@/lib/announcements/client-state";
import type { TrackEventType } from "@/lib/announcements/types";

export function useAnnouncementTrack() {
  const pathname = usePathname();

  const track = useCallback(
    async (
      announcementId: string,
      eventType: TrackEventType,
      options?: { variantKey?: string; perSession?: boolean },
    ) => {
      if (eventType === "impression") {
        markAnnouncementSeen(announcementId, options?.perSession);
      }
      if (eventType === "dismiss") markAnnouncementDismissed(announcementId);
      if (eventType === "click") markAnnouncementClicked(announcementId);

      try {
        await fetch("/api/announcements/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            announcementId,
            eventType,
            sessionId: getSessionId(),
            page: pathname,
            variantKey: options?.variantKey,
          }),
        });
      } catch {
        /* non-blocking */
      }
    },
    [pathname],
  );

  return { track };
}
