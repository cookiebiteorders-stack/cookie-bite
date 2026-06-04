"use client";

import { useCallback, useEffect, useState } from "react";
import type { MrBrownieAnalyticsSnapshot } from "@/lib/mr-brownie/brain/analytics";

export function MrBrownieAnalyticsDashboard() {
  const [data, setData] = useState<MrBrownieAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mr-brownie/analytics?days=${days}`, {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.ar ?? json?.error?.en ?? "Failed to load");
        setData(null);
        return;
      }
      setData(json as MrBrownieAnalyticsSnapshot);
    } catch {
      setError("تعذر تحميل التحليلات");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-cb-text-strong">Mr. Brownie — تحليل الذكاء</h1>
          <p className="mt-1 text-sm text-cb-text-muted">
            جودة الردود، النيات، واقتراحات تحسين الـ Rules / Examples
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-cb-text-muted">الفترة (أيام)</span>
          <select
            className="rounded-lg border border-cb-border bg-white px-2 py-1"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7</option>
            <option value={30}>30</option>
            <option value={90}>90</option>
          </select>
        </label>
      </header>

      {loading ? (
        <p className="text-sm text-cb-text-muted">جاري التحميل…</p>
      ) : error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="محادثات مسجّلة" value={String(data.totals.turns)} />
            <StatCard
              label="رضا 👍"
              value={
                data.totals.satisfaction_pct != null
                  ? `${data.totals.satisfaction_pct}%`
                  : "—"
              }
            />
            <StatCard label="👍 / 👎" value={`${data.totals.feedback_up} / ${data.totals.feedback_down}`} />
            <StatCard
              label="متوسط جودة الرد"
              value={
                data.totals.avg_quality_score != null
                  ? `${data.totals.avg_quality_score}/100`
                  : "—"
              }
            />
          </section>

          <section className="rounded-xl border border-cb-border bg-white p-4">
            <h2 className="font-semibold text-cb-text-strong">النيات (Intents)</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.intents.map((row) => (
                <li key={row.intent} className="flex justify-between gap-4">
                  <span>{row.intent}</span>
                  <span className="text-cb-text-muted">
                    {row.count} ({row.weak_count} ضعيف)
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-cb-border bg-white p-4">
            <h2 className="font-semibold text-cb-text-strong">مشاكل الجودة</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.quality_issues.length === 0 ? (
                <li className="text-cb-text-muted">لا توجد بيانات كافية بعد.</li>
              ) : (
                data.quality_issues.map((row) => (
                  <li key={row.issue} className="flex justify-between">
                    <span>{row.issue}</span>
                    <span>{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </section>

          {data.suggested_rules.length > 0 ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <h2 className="font-semibold text-amber-950">قواعد مقترحة (من التحليل)</h2>
              <ul className="mt-2 list-disc ps-5 text-sm text-amber-950">
                {data.suggested_rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-amber-900/80">
                أضفها يدوياً في <code className="rounded bg-white/60 px-1">behavior-rules.ts</code> أو
                شغّل <code className="rounded bg-white/60 px-1">npm run mr-brownie:auto-improve</code>
              </p>
            </section>
          ) : null}

          {data.weak_samples.length > 0 ? (
            <section className="rounded-xl border border-cb-border bg-white p-4">
              <h2 className="font-semibold text-cb-text-strong">عينات ردود ضعيفة</h2>
              <div className="mt-3 space-y-4 text-sm">
                {data.weak_samples.map((s, i) => (
                  <div key={i} className="rounded-lg bg-cb-surface-2/50 p-3">
                    <p className="text-xs text-cb-text-muted">
                      {s.intent} · score {s.score ?? "—"}
                    </p>
                    <p className="mt-1 font-medium">س: {s.user_message}</p>
                    <p className="mt-1 text-cb-text-muted">ج: {s.assistant_message}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cb-border bg-white p-4">
      <p className="text-xs text-cb-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-cb-text-strong">{value}</p>
    </div>
  );
}
