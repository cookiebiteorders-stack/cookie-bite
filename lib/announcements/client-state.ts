const STORAGE_PREFIX = "cb_ann_";
const SESSION_KEY = "cb_ann_session";

export type GuestAnnouncementState = {
  dismissedAt?: string;
  seenAt?: string;
  clickedAt?: string;
  impressionCount?: number;
  abVariantKey?: string;
};

function readStore(): Record<string, GuestAnnouncementState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}state`);
    return raw ? (JSON.parse(raw) as Record<string, GuestAnnouncementState>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, GuestAnnouncementState>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `sess_${Date.now()}`;
  }
}

export function getGuestAnnouncementState(id: string): GuestAnnouncementState {
  return readStore()[id] ?? {};
}

export function patchGuestAnnouncementState(
  id: string,
  patch: Partial<GuestAnnouncementState>,
) {
  const store = readStore();
  store[id] = { ...store[id], ...patch };
  writeStore(store);
}

export function shouldShowAnnouncement(
  id: string,
  frequency: { perSession?: boolean; cooldownHours?: number; untilInteract?: boolean },
): boolean {
  const state = getGuestAnnouncementState(id);
  if (frequency.untilInteract && state.clickedAt) return false;
  if (frequency.perSession && state.seenAt) {
    const seenSession = sessionStorage.getItem(`${STORAGE_PREFIX}seen_${id}`);
    if (seenSession) return false;
  }
  if (state.dismissedAt && frequency.cooldownHours) {
    const dismissed = new Date(state.dismissedAt).getTime();
    const cooldownMs = frequency.cooldownHours * 60 * 60 * 1000;
    if (Date.now() - dismissed < cooldownMs) return false;
  }
  return true;
}

export function markAnnouncementSeen(id: string, perSession?: boolean) {
  patchGuestAnnouncementState(id, {
    seenAt: new Date().toISOString(),
    impressionCount: (getGuestAnnouncementState(id).impressionCount ?? 0) + 1,
  });
  if (perSession) {
    try {
      sessionStorage.setItem(`${STORAGE_PREFIX}seen_${id}`, "1");
    } catch {
      /* ignore */
    }
  }
}

export function markAnnouncementDismissed(id: string) {
  patchGuestAnnouncementState(id, { dismissedAt: new Date().toISOString() });
}

export function markAnnouncementClicked(id: string) {
  patchGuestAnnouncementState(id, { clickedAt: new Date().toISOString() });
}

export function setAbVariantForAnnouncement(id: string, key: string) {
  patchGuestAnnouncementState(id, { abVariantKey: key });
}

export function getAbVariantForAnnouncement(id: string): string | undefined {
  return getGuestAnnouncementState(id).abVariantKey;
}
