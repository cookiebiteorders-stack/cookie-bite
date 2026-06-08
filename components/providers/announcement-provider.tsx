"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { getClientBehaviors, markClientBehavior } from "@/lib/announcements/behavior";
import { shouldShowAnnouncement, getSessionId } from "@/lib/announcements/client-state";
import { resolvePageFromPath } from "@/lib/announcements/shared";
import type {
  AnnouncementType,
  AnnouncementUserContext,
  AnnouncementView,
  AudienceUserType,
} from "@/lib/announcements/types";

type AnnouncementContextValue = {
  loaded: boolean;
  announcements: AnnouncementView[];
  getByType: (type: AnnouncementType) => AnnouncementView[];
  refresh: () => void;
  context: AnnouncementUserContext;
};

const DEFAULT_CONTEXT: AnnouncementUserContext = {
  isSignedIn: false,
  userType: "guest",
  page: "all",
};

const AnnouncementContext = createContext<AnnouncementContextValue>({
  loaded: false,
  announcements: [],
  getByType: () => [],
  refresh: () => {},
  context: DEFAULT_CONTEXT,
});

function resolveUserType(
  isSignedIn: boolean,
  isStaff: boolean,
  loyaltyTier?: string | null,
): AudienceUserType {
  if (!isSignedIn) return "guest";
  if (isStaff) return "staff";
  if (loyaltyTier === "gold" || loyaltyTier === "platinum") return "premium";
  return "logged_in";
}

export function AnnouncementProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [behaviorTick, setBehaviorTick] = useState(0);

  const userName =
    user?.firstName ??
    user?.username ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ??
    null;

  const page = resolvePageFromPath(pathname);
  const isStaff = Boolean(
    user?.publicMetadata?.role &&
      ["owner", "admin", "staff"].includes(String(user.publicMetadata.role)),
  );

  const context = useMemo<AnnouncementUserContext>(
    () => ({
      isSignedIn: Boolean(isSignedIn),
      userType: resolveUserType(Boolean(isSignedIn), isStaff),
      userName,
      page,
      behaviors: getClientBehaviors(),
    }),
    [isSignedIn, isStaff, userName, page, behaviorTick],
  );

  useEffect(() => {
    if (isSignedIn) markClientBehavior("logged_in");
  }, [isSignedIn]);

  useEffect(() => {
    const onBehaviors = () => setBehaviorTick((n) => n + 1);
    window.addEventListener("cookiebite:behaviors-changed", onBehaviors);
    return () => window.removeEventListener("cookiebite:behaviors-changed", onBehaviors);
  }, []);

  const fetchAnnouncements = useCallback(() => {
    if (!isLoaded) return;
    const params = new URLSearchParams({
      page: pathname,
      lang,
      sessionId: getSessionId(),
      behaviors: getClientBehaviors().join(","),
      _t: String(Date.now()),
    });

    fetch(`/api/announcements?${params}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { announcements?: AnnouncementView[] } | null) => {
        const items = data?.announcements ?? [];
        const visible = items.filter(
          (item) =>
            item.type === "banner" || shouldShowAnnouncement(item.id, item.frequency),
        );
        setAnnouncements(visible);
      })
      .catch(() => setAnnouncements([]))
      .finally(() => setLoaded(true));
  }, [isLoaded, pathname, lang, behaviorTick]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel("cookiebite:announcements");
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "refresh") fetchAnnouncements();
    };
    channel.addEventListener("message", onMessage);
    return () => {
      channel.removeEventListener("message", onMessage);
      channel.close();
    };
  }, [fetchAnnouncements]);

  useEffect(() => {
    const onChanged = () => fetchAnnouncements();
    window.addEventListener("cookiebite:announcements-changed", onChanged);
    return () =>
      window.removeEventListener("cookiebite:announcements-changed", onChanged);
  }, [fetchAnnouncements]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchAnnouncements();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchAnnouncements]);

  const getByType = useCallback(
    (type: AnnouncementType) => announcements.filter((a) => a.type === type),
    [announcements],
  );

  const value = useMemo(
    () => ({
      loaded,
      announcements,
      getByType,
      refresh: fetchAnnouncements,
      context,
    }),
    [loaded, announcements, getByType, fetchAnnouncements, context],
  );

  return (
    <AnnouncementContext.Provider value={value}>{children}</AnnouncementContext.Provider>
  );
}

export function useAnnouncements() {
  return useContext(AnnouncementContext);
}
