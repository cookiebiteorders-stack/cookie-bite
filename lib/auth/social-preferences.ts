export const AUTH_SOCIAL_POPUP_DESKTOP_KEY = "cb_auth_social_popup_desktop";

export function getDesktopSocialPopupPreference(): boolean {
  if (typeof window === "undefined") return true;
  const raw = window.localStorage.getItem(AUTH_SOCIAL_POPUP_DESKTOP_KEY);
  if (raw == null) return true;
  return raw === "1";
}

export function setDesktopSocialPopupPreference(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    AUTH_SOCIAL_POPUP_DESKTOP_KEY,
    enabled ? "1" : "0",
  );
}

