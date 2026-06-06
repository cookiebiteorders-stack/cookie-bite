"use client";

import dynamic from "next/dynamic";
import { useDeferredReady } from "@/lib/hooks/use-deferred-ready";

const AnnouncementBar = dynamic(
  () => import("@/components/layout/announcement-bar").then((m) => m.AnnouncementBar),
  { ssr: false, loading: () => null },
);

export function DeferredAnnouncementBar() {
  const ready = useDeferredReady({ idleTimeout: 3000, fallbackMs: 2500 });
  if (!ready) return null;
  return <AnnouncementBar />;
}
