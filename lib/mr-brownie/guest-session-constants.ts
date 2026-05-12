export const MR_BROWNIE_GUEST_SESSION_COOKIE = "mr_brownie_guest_session";

export function isGuestSessionUuid(value: string | undefined | null): value is string {
  if (typeof value !== "string" || value.length !== 36) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
