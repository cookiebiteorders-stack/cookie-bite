"use client";

import {
  formatRealtimeTimestamp,
  formatRelativeAgo,
  type AppLang,
} from "@/lib/admin/realtime-display";

export type PresenceTimingField = {
  label: string;
  at: string | number | null | undefined;
};

export function PresenceTimingGrid({
  fields,
  lang,
}: {
  fields: PresenceTimingField[];
  lang: AppLang;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => {
        const timestamp = formatRealtimeTimestamp(field.at, lang);
        const ago = formatRelativeAgo(field.at, lang);
        return (
          <div
            key={field.label}
            className="rounded-lg border border-cb-border/60 bg-cb-surface px-3 py-2"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted">
              {field.label}
            </p>
            <p className="mt-0.5 text-sm font-medium text-cb-text">{timestamp}</p>
            <p className="mt-0.5 text-[11px] text-cb-text-muted">{ago}</p>
          </div>
        );
      })}
    </div>
  );
}

export type PresenceTimelineItem = {
  key: string;
  title: string;
  subtitle?: string | null;
  occurred_at: string;
};

export function PresenceActivityTimeline({
  title,
  items,
  lang,
  emptyLabel,
}: {
  title: string;
  items: PresenceTimelineItem[];
  lang: AppLang;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return (
      <div className="mt-2 rounded-lg border border-dashed border-cb-border/70 px-3 py-2 text-xs text-cb-text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-cb-border/70 bg-cb-surface px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-cb-text-muted">{title}</p>
      <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-start justify-between gap-2 border-b border-cb-border/40 pb-2 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-cb-text">{item.title}</p>
              {item.subtitle ? (
                <p className="truncate text-[11px] text-cb-text-muted">{item.subtitle}</p>
              ) : null}
            </div>
            <div className="shrink-0 text-right text-[11px] text-cb-text-muted">
              <p className="font-mono">{formatRealtimeTimestamp(item.occurred_at, lang)}</p>
              <p>{formatRelativeAgo(item.occurred_at, lang)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
