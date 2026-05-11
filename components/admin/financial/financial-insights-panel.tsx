"use client";

import { Lightbulb, Sparkles } from "lucide-react";
import type { FinancialInsight } from "@/lib/financial/insights";
import { cn } from "@/lib/utils";

type Props = { insights: FinancialInsight[] };

function toneClass(t: FinancialInsight["tone"]) {
  if (t === "positive") return "border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30";
  if (t === "warning") return "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30";
  return "border-cb-border bg-cb-surface/80";
}

export function FinancialInsightsPanel({ insights }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
        <h2 className="font-serif text-xl font-bold text-cb-text-strong">Insights & signals</h2>
      </div>
      <p className="text-sm text-cb-text-muted">
        Heuristics from your current range — not ML predictions. Use them to spot pacing changes early.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((ins) => (
          <article
            key={ins.id}
            className={cn("rounded-2xl border p-4 shadow-sm", toneClass(ins.tone))}
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-cb-text-muted" />
              <div>
                <h3 className="font-semibold text-cb-text-strong">{ins.title}</h3>
                <p className="mt-1 text-sm text-cb-text">{ins.detail}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
