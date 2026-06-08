"use client";

export const ANNOUNCEMENT_TRIGGER_EVENT = "cookiebite:announcement-trigger";

export type AnnouncementTriggerDetail = {
  event: string;
};

export function dispatchAnnouncementTrigger(event: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AnnouncementTriggerDetail>(ANNOUNCEMENT_TRIGGER_EVENT, {
      detail: { event },
    }),
  );
}

export function onAnnouncementTrigger(
  handler: (event: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<AnnouncementTriggerDetail>).detail;
    if (detail?.event) handler(detail.event);
  };
  window.addEventListener(ANNOUNCEMENT_TRIGGER_EVENT, listener);
  return () => window.removeEventListener(ANNOUNCEMENT_TRIGGER_EVENT, listener);
}
