import { persistId, readPersistedId, getLocal, setLocal } from "./storage";
import { uuid } from "./uuid";
import { computeFingerprint } from "./fingerprint";

export const VISITOR_KEY = "cb_visitor_id";
export const SESSION_KEY = "cb_session_id";
export const SESSION_LAST_SEEN_KEY = "cb_session_last_seen";
export const VISITOR_FIRST_SEEN_KEY = "cb_visitor_first_seen";

const DEFAULT_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export interface VisitorIdentity {
  visitor_id: string;
  session_id: string;
  fingerprint: string;
  is_new_visitor: boolean;
  is_new_session: boolean;
}

interface ResolveOptions {
  sessionTimeoutMs?: number;
  now?: number;
}

function makeVisitorId(): string {
  return `vis_${uuid().replace(/-/g, "").slice(0, 24)}`;
}

function makeSessionId(): string {
  return `ses_${uuid().replace(/-/g, "").slice(0, 24)}`;
}

/**
 * Resolve (or create) the visitor & session identifiers stored on the device.
 * Should be called on every page load before sending the first event.
 */
export function resolveIdentity(options: ResolveOptions = {}): VisitorIdentity {
  const { sessionTimeoutMs = DEFAULT_SESSION_TIMEOUT_MS, now = Date.now() } = options;
  const fingerprint = computeFingerprint();

  let visitor_id = readPersistedId(VISITOR_KEY);
  let is_new_visitor = false;
  if (!visitor_id) {
    visitor_id = makeVisitorId();
    is_new_visitor = true;
    persistId(VISITOR_KEY, visitor_id);
    setLocal(VISITOR_FIRST_SEEN_KEY, new Date(now).toISOString());
  }

  let session_id = readPersistedId(SESSION_KEY);
  const lastSeenRaw = getLocal(SESSION_LAST_SEEN_KEY);
  const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : 0;
  const expired = !lastSeen || now - lastSeen > sessionTimeoutMs;
  let is_new_session = false;
  if (!session_id || expired) {
    session_id = makeSessionId();
    is_new_session = true;
    persistId(SESSION_KEY, session_id);
  }
  setLocal(SESSION_LAST_SEEN_KEY, String(now));

  return { visitor_id, session_id, fingerprint, is_new_visitor, is_new_session };
}

/** Update the session's last-seen timestamp (called on every event). */
export function touchSession(now = Date.now()): void {
  setLocal(SESSION_LAST_SEEN_KEY, String(now));
}
