"use client";

import { useCallback, useEffect, useState } from "react";
import type { MrBrownieAnalyticsSnapshot } from "@/lib/mr-brownie/brain/analytics";
import type { MrBrownieWeeklyReport } from "@/lib/mr-brownie/admin/weekly-report";

export function MrBrownieAnalyticsDashboard({ embedded = false }: { embedded?: boolean } = {}) {
  const [data, setData] = useState<MrBrownieAnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [weekly, setWeekly] = useState<MrBrownieWeeklyReport | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

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

  const loadWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const res = await fetch("/api/admin/mr-brownie/weekly-report?days=7", {
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => null);
      setWeekly(json?.report ?? null);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-5xl space-y-6 p-6"}>
      {!embedded ? (
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
      ) : (
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
      )}

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

          {data.personas?.length ? (
            <section className="rounded-xl border border-cb-border bg-white p-4">
              <h2 className="font-semibold text-cb-text-strong">الشخصيات والمشاعر</h2>
              <p className="mt-1 text-xs text-cb-text-muted">
                متوسط المشاعر: {data.avg_sentiment ?? "—"}
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {data.personas.map((row) => (
                  <li key={row.persona} className="flex justify-between gap-4">
                    <span>{row.persona}</span>
                    <span className="text-cb-text-muted">
                      {row.count} · مشاعر {row.avg_sentiment ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.rag ? (
            <section className="rounded-xl border border-cb-border bg-white p-4">
              <h2 className="font-semibold text-cb-text-strong">أداء RAG</h2>
              <p className="mt-1 text-xs text-cb-text-muted">
                نسبة الإصابة: {data.rag.hit_rate_pct != null ? `${data.rag.hit_rate_pct}%` : "—"}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <FunnelStep
                  label="pgvector"
                  value={data.rag.vector_hits}
                  base={data.rag.vector_hits + data.rag.keyword_hits + data.rag.misses}
                />
                <FunnelStep
                  label="keyword fallback"
                  value={data.rag.keyword_hits}
                  base={data.rag.vector_hits + data.rag.keyword_hits + data.rag.misses}
                />
                <FunnelStep
                  label="فجوات (لا نتائج)"
                  value={data.rag.misses}
                  base={data.rag.vector_hits + data.rag.keyword_hits + data.rag.misses}
                  warn
                />
              </div>
            </section>
          ) : null}

          {data.knowledge_gaps?.length ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-4">
              <h2 className="font-semibold text-amber-950">فجوات المعرفة (تحتاج FAQ)</h2>
              <p className="mt-1 text-xs text-amber-900/80">
                استعلامات لم يُجب عليها RAG — أضفها في FAQ أو أعد الفهرسة
              </p>
              <ul className="mt-3 space-y-2 text-sm text-amber-950">
                {data.knowledge_gaps.map((g) => (
                  <li
                    key={`${g.query_text}:${g.locale ?? ""}`}
                    className="flex justify-between gap-4 rounded-lg bg-white/60 px-3 py-2"
                  >
                    <span className="line-clamp-2">{g.query_text}</span>
                    <span className="shrink-0 text-amber-900/70">
                      ×{g.occurrence_count}
                      {g.locale ? ` · ${g.locale}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {data.funnel ? (
            <section className="rounded-xl border border-cb-border bg-white p-4">
              <h2 className="font-semibold text-cb-text-strong">قمع التفاعل (Funnel)</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <FunnelStep label="إجمالي الأدوار" value={data.funnel.turns} base={data.funnel.turns} />
                <FunnelStep
                  label="نية شراء/هدية"
                  value={data.funnel.product_intent_turns}
                  base={data.funnel.turns}
                />
                <FunnelStep
                  label="مشاعر إيجابية"
                  value={data.funnel.positive_sentiment_turns}
                  base={data.funnel.turns}
                />
                <FunnelStep
                  label="ردود ضعيفة"
                  value={data.funnel.weak_turns}
                  base={data.funnel.turns}
                  warn
                />
              </div>
            </section>
          ) : null}

          {data.prompt_variants?.length ? (
            <section className="rounded-xl border border-cb-border bg-white p-4">
              <h2 className="font-semibold text-cb-text-strong">اختبار A/B للبرومبت</h2>
              <p className="mt-1 text-xs text-cb-text-muted">
                مقارنة أداء variant A مقابل B (جودة الرد + المشاعر)
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {data.prompt_variants.map((row) => (
                  <li
                    key={row.variant}
                    className="flex items-center justify-between gap-4 rounded-lg bg-cb-surface-2/50 px-3 py-2"
                  >
                    <span className="font-semibold">Variant {row.variant.toUpperCase()}</span>
                    <span className="text-cb-text-muted">
                      {row.count} رد · جودة {row.avg_quality ?? "—"} · مشاعر{" "}
                      {row.avg_sentiment ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

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

          <section className="rounded-xl border border-cb-border bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-cb-text-strong">التقرير الأسبوعي</h2>
              <button
                type="button"
                disabled={weeklyLoading}
                onClick={() => void loadWeekly()}
                className="rounded-lg border border-cb-border bg-white px-3 py-1.5 text-sm font-semibold text-cb-text-strong disabled:opacity-50"
              >
                {weeklyLoading ? "جاري التحميل…" : "تحميل (7 أيام)"}
              </button>
            </div>
            {weekly ? (
              <div className="mt-3 space-y-3 text-sm">
                <p className="text-cb-text-muted">
                  محادثات {weekly.summary.turns} · رضا{" "}
                  {weekly.summary.satisfaction_pct ?? "—"}% · RAG{" "}
                  {weekly.summary.rag_hit_rate_pct ?? "—"}% · شكاوى{" "}
                  {weekly.summary.complaint_turns}
                </p>
                {weekly.suggested_actions.length ? (
                  <ul className="list-disc ps-5 text-cb-text-strong">
                    {weekly.suggested_actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                ) : null}
                {weekly.top_knowledge_gaps.length ? (
                  <ul className="space-y-1 text-cb-text-muted">
                    {weekly.top_knowledge_gaps.slice(0, 5).map((g) => (
                      <li key={g.query_text}>
                        ×{g.occurrence_count} {g.query_text}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-cb-text-muted">
                أو شغّل: npm run mr-brownie:weekly-report
              </p>
            )}
          </section>

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

function FunnelStep({
  label,
  value,
  base,
  warn = false,
}: {
  label: string;
  value: number;
  base: number;
  warn?: boolean;
}) {
  const pct = base > 0 ? Math.round((value / base) * 100) : 0;
  return (
    <div className="rounded-lg bg-cb-surface-2/50 p-3">
      <p className="text-xs text-cb-text-muted">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${warn ? "text-red-700" : "text-cb-text-strong"}`}
      >
        {value}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cb-border/40">
        <div
          className={`h-full rounded-full ${warn ? "bg-red-500" : "bg-[#d4a055]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-cb-text-muted">{pct}%</p>
    </div>
  );
}
