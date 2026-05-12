const MR_BROWNIE_LS_PREFIX = "mr-brownie-chat-v1";

/** مفتاح localStorage: عميل مسجّل حسب Clerk user id، أو `guest` للزائر */
export function mrBrownieChatLsKey(clerkUserId: string | null | undefined): string {
  return clerkUserId ? `${MR_BROWNIE_LS_PREFIX}:u:${clerkUserId}` : `${MR_BROWNIE_LS_PREFIX}:guest`;
}

export type ChatMessagePersisted = {
  role: "user" | "assistant";
  content: string;
  /** وقت تقديري للدمج مع السيرفر */
  createdAt?: number;
};

export type ChatHistoryApiRow = {
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
};

/** @deprecated استخدم ChatHistoryApiRow */
export type MrBrownieHistoryRow = ChatHistoryApiRow;

function normalizeLocalMessage(m: ChatMessagePersisted, index: number, total: number): ChatMessagePersisted {
  if (typeof m.createdAt === "number" && Number.isFinite(m.createdAt)) return m;
  const base = Date.now() - (total - index) * 1000;
  return { ...m, createdAt: base };
}

/** دمج سجل السيرفر مع المحلي؛ إزالة التكرار القريب (نفس الدور + المحتوى خلال ثانيتين) */
export function mergeServerAndLocal(
  server: ChatHistoryApiRow[],
  local: ChatMessagePersisted[],
): ChatMessagePersisted[] {
  const fromServer: ChatMessagePersisted[] = server.map((r) => ({
    role: r.role,
    content: r.content,
    createdAt: new Date(r.created_at).getTime(),
  }));

  const localNorm = local.map((m, i) => normalizeLocalMessage(m, i, local.length));

  const merged = [...fromServer, ...localNorm].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  const deduped: ChatMessagePersisted[] = [];
  for (const m of merged) {
    const prev = deduped[deduped.length - 1];
    if (
      prev &&
      prev.role === m.role &&
      prev.content === m.content &&
      Math.abs((m.createdAt ?? 0) - (prev.createdAt ?? 0)) < 2000
    ) {
      continue;
    }
    deduped.push(m);
  }

  return deduped.slice(-100);
}

export function loadPersistedMessages(storageKey: string): ChatMessagePersisted[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: ChatMessagePersisted[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const roleRaw = (item as { role?: unknown }).role;
      if (roleRaw !== "user" && roleRaw !== "assistant") continue;
      const role = roleRaw as "user" | "assistant";
      const content = String((item as { content?: unknown }).content ?? "").slice(0, 12000);
      if (!content.trim()) continue;
      const createdAt = (item as { createdAt?: unknown }).createdAt;
      out.push({
        role,
        content,
        createdAt: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : undefined,
      });
    }
    return out.slice(-100);
  } catch {
    return [];
  }
}

export function savePersistedMessages(storageKey: string, messages: ChatMessagePersisted[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-100)));
  } catch {
    /* مساحة تخزين ممتلئة أو وضع خاص */
  }
}
