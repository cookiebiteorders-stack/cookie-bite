/** معرّف جلسة الضيف في المتصفح (يُمرَّر لـ API مع كل طلب) */
export const CHAT_SESSION_ID_KEY = "chat_session_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isChatSessionUuid(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length === 36 && UUID_RE.test(value);
}

export function getOrCreateChatSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(CHAT_SESSION_ID_KEY);
    if (isChatSessionUuid(existing)) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(CHAT_SESSION_ID_KEY, id);
    return id;
  } catch {
    return "";
  }
}
