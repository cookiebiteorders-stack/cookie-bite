"use client";

import { useCallback, useEffect, useState } from "react";
import type { MrBrownieConversationRow } from "@/lib/mr-brownie/admin/conversations";

export function MrBrownieConversationsPanel() {
  const [rows, setRows] = useState<MrBrownieConversationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [persona, setPersona] = useState("");
  const [intent, setIntent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(days), limit: "50" });
      if (persona) qs.set("persona", persona);
      if (intent.trim()) qs.set("intent", intent.trim());
      const res = await fetch(`/api/admin/mr-brownie/conversations?${qs}`, {
        credentials: "same-origin",
      });
      const json = await res.json();
      if (!res.ok) {
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(json.rows ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [days, persona, intent]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    setConfirmId(null);
    try {
      const res = await fetch("/api/admin/mr-brownie/conversations", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setDeletingId(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-cb-text-muted">الفترة</span>
          <select
            className="ms-2 rounded-lg border border-cb-border bg-white px-2 py-1"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 أيام</option>
            <option value={30}>30 يوم</option>
            <option value={90}>90 يوم</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-cb-text-muted">الشخصية</span>
          <select
            className="ms-2 rounded-lg border border-cb-border bg-white px-2 py-1"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          >
            <option value="">الكل</option>
            <option value="mr_brownie">Mr. Brownie</option>
            <option value="mrs_cookie">Mrs. Cookie</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-cb-text-muted">Intent</span>
          <input
            className="ms-2 rounded-lg border border-cb-border bg-white px-2 py-1"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="gift_request"
          />
        </label>
        <a
          href={`/api/admin/mr-brownie/conversations?days=${days}&format=csv${persona ? `&persona=${persona}` : ""}${intent ? `&intent=${encodeURIComponent(intent)}` : ""}`}
          className="rounded-lg border border-cb-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-cb-cream"
        >
          تصدير CSV
        </a>
      </div>

      <p className="text-sm text-cb-text-muted">
        {total} محادثة مسجّلة {loading ? "— جاري التحميل…" : ""}
      </p>

      <div className="space-y-3">
        {rows.map((r) => (
          <article
            key={r.id}
            className="rounded-xl border border-cb-border bg-white p-4 text-sm"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-cb-text-muted">
              <span>{new Date(r.created_at).toLocaleString("ar-EG")}</span>
              {r.intent ? <span>· {r.intent}</span> : null}
              {r.active_persona ? <span>· {r.active_persona}</span> : null}
              {r.sentiment_score != null ? (
                <span>· مشاعر {r.sentiment_score}</span>
              ) : null}
              {r.quality_score != null ? <span>· جودة {r.quality_score}</span> : null}
              <span className="ms-auto flex items-center gap-2">
                {confirmId === r.id ? (
                  <>
                    <span className="text-red-600">تأكيد الحذف؟</span>
                    <button
                      onClick={() => void handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="rounded bg-red-600 px-2 py-0.5 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === r.id ? "…" : "نعم، احذف"}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded border border-cb-border px-2 py-0.5 hover:bg-cb-cream"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirmId(r.id)}
                    title="حذف هذه المحادثة"
                    className="rounded p-1 text-cb-text-muted hover:bg-red-50 hover:text-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193v-.443A2.75 2.75 0 0 0 11.25 1h-2.5Zm0 1.5h2.5c.69 0 1.25.56 1.25 1.25v.313a42.981 42.981 0 0 0-5 0v-.313c0-.69.56-1.25 1.25-1.25ZM6.5 6.997l.82 10.26a1.25 1.25 0 0 0 1.247 1.143h2.866a1.25 1.25 0 0 0 1.247-1.143L13.5 6.997H6.5Z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </span>
            </div>
            <p className="font-medium text-cb-text-strong">👤 {r.user_message.slice(0, 280)}</p>
            <p className="mt-2 text-cb-text-muted">🤖 {r.assistant_message.slice(0, 320)}</p>
          </article>
        ))}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-cb-text-muted">لا توجد محادثات في هذه الفترة.</p>
        ) : null}
      </div>
    </div>
  );
}
