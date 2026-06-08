"use client";

import dynamic from "next/dynamic";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { useDeferredReady } from "@/lib/hooks/use-deferred-ready";

const PopupManager = dynamic(  () =>
    import("@/components/announcements/popup-manager").then((m) => ({
      default: m.PopupManager,
    })),
  { ssr: false, loading: () => null },
);

const LiveActivityToast = dynamic(
  () =>
    import("@/components/announcements/live-activity-toast").then((m) => ({
      default: m.LiveActivityToast,
    })),
  { ssr: false, loading: () => null },
);

/** الشريط المتحرك الكلاسيكي — يظهر دائماً فوق الهيدر */
export function StorefrontTopAnnouncementBar() {
  return <AnnouncementBar />;
}
/** Popups + social proof — خارج الشريط العلوي */
export function StorefrontAnnouncementOverlays() {
  const ready = useDeferredReady({ idleTimeout: 2500, fallbackMs: 2000 });
  if (!ready) return null;

  return (
    <>
      <PopupManager />
      <LiveActivityToast />
    </>
  );
}

/** @deprecated استخدم StorefrontTopAnnouncementBar + StorefrontAnnouncementOverlays */
export function AnnouncementEngine() {
  return (
    <>
      <StorefrontTopAnnouncementBar />
      <StorefrontAnnouncementOverlays />
    </>
  );
}
