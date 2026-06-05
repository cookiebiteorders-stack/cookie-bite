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
            <div className="mb-2 flex flex-wrap gap-2 text-xs text-cb-text-muted">
              <span>{new Date(r.created_at).toLocaleString("ar-EG")}</span>
              {r.intent ? <span>· {r.intent}</span> : null}
              {r.active_persona ? <span>· {r.active_persona}</span> : null}
              {r.sentiment_score != null ? (
                <span>· مشاعر {r.sentiment_score}</span>
              ) : null}
              {r.quality_score != null ? <span>· جودة {r.quality_score}</span> : null}
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
