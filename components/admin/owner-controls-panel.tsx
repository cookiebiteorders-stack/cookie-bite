"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import {
  OWNER_FLAG_KEYS,
  OWNER_FLAG_LABELS,
  type OwnerFlagKey,
  type OwnerFlags,
} from "@/lib/store/owner-flags";
import { cn } from "@/lib/utils";

type OwnerFlagsResponse = {
  flags: OwnerFlags;
  actor?: { role: string };
};

type Props = {
  /** Hide entirely for non-owners */
  canManage: boolean;
};

export function OwnerControlsPanel({ canManage }: Props) {
  const [flags, setFlags] = useState<OwnerFlags | null>(null);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<OwnerFlagKey | null>(null);

  const loadFlags = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson<OwnerFlagsResponse>("/api/admin/settings/owner-flags", {
        cache: "no-store",
      });
      setFlags(data.flags);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load owner flags");
      setFlags(null);
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  async function toggleFlag(key: OwnerFlagKey) {
    if (!flags || busyKey) return;
    const enabled = !flags[key];
    setBusyKey(key);
    setError(null);
    const previous = flags;
    setFlags({ ...flags, [key]: enabled });

    try {
      const data = await fetchJson<OwnerFlagsResponse>("/api/admin/settings/owner-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, enabled }),
      });
      setFlags(data.flags);
    } catch (err) {
      setFlags(previous);
      setError(err instanceof Error ? err.message : "Failed to update flag");
    } finally {
      setBusyKey(null);
    }
  }

  if (!canManage) return null;

  return (
    <article className="rounded-3xl border border-cb-border bg-cb-surface-elevated p-5 shadow-sm">
      <h3 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
        <KeyRound className="h-5 w-5 text-amber-700 dark:text-amber-300" />
        Owner Controls
      </h3>
      <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
        Persisted store flags — changes apply site-wide within ~30 seconds.
      </p>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {loading && !flags ? (
          <p className="flex items-center gap-2 text-xs text-stone-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading flags…
          </p>
        ) : null}

        {OWNER_FLAG_KEYS.map((flag) => {
          const on = flags?.[flag] ?? false;
          const meta = OWNER_FLAG_LABELS[flag];
          const busy = busyKey === flag;

          return (
            <button
              key={flag}
              type="button"
              disabled={!flags || busy}
              onClick={() => void toggleFlag(flag)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-start text-xs font-bold transition",
                on
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-cb-border bg-white text-stone-800 dark:bg-stone-900/70 dark:text-stone-200",
                busy && "opacity-70",
              )}
              aria-pressed={on}
            >
              <span className="min-w-0">
                <span className="block font-mono text-[11px]">{flag}</span>
                <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                  {meta.description.en}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {on ? "ON" : "OFF"}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}
