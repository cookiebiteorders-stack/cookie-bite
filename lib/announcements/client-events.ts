import { ANNOUNCEMENTS_CHANGED_EVENT } from "@/lib/announcements/shared";

export function broadcastAnnouncementsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_CHANGED_EVENT));
  try {
    const channel = new BroadcastChannel("cookiebite:announcements");
    channel.postMessage({ type: "refresh" });
    channel.close();
  } catch {
    /* unsupported */
  }
}
