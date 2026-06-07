"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { arEG } from "date-fns/locale";
import { Clock, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { fetchJson } from "@/lib/http/fetch-json";
import { cn } from "@/lib/utils";

type HistoryLog = {
  id: string;
  action: string;
  actor_email: string | null;
  created_at: string;
  summary: string;
  severity?: string;
  can_undo?: boolean;
};

type ProductVersion = {
  id: string;
  version_number: number;
  reason: string | null;
  created_by_email: string | null;
  created_at: string;
};

type Props = {
  productId: string | null;
  open: boolean;
  canWrite?: boolean;
  onRestored?: () => void;
};

export function ProductHistoryPanel({ productId, open, canWrite = false, onRestored }: Props) {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"history" | "versions">("history");

  const reload = () => {
    if (!productId) return;
    setLoading(true);
    Promise.all([
      fetchJson<{ logs: HistoryLog[] }>(`/api/admin/products/${productId}/history?limit=25`, {
        cache: "no-store",
      }),
      fetchJson<{ versions: ProductVersion[] }>(`/api/admin/products/${productId}/versions?limit=15`, {
        cache: "no-store",
      }),
    ])
      .then(([history, vers]) => {
        setLogs(history.logs ?? []);
        setVersions(vers.versions ?? []);
      })
      .catch(() => {
        setLogs([]);
        setVersions([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !productId) return;
    reload();
  }, [open, productId]);

  const undoAudit = async (auditLogId: string) => {
    if (!productId || !canWrite) return;
    if (!window.confirm("تراجع عن هذا التعديل واستعادة الحالة السابقة؟")) return;
    setBusyId(auditLogId);
    try {
      await fetchJson(`/api/admin/products/${productId}/undo`, {
        method: "POST",
        jsonBody: { audit_log_id: auditLogId },
      });
      reload();
      onRestored?.();
    } finally {
      setBusyId(null);
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!productId || !canWrite) return;
    if (!window.confirm("استعادة هذه النسخة المحفوظة؟")) return;
    setBusyId(versionId);
    try {
      await fetchJson(`/api/admin/products/${productId}/versions/${versionId}/restore`, {
        method: "POST",
        jsonBody: {},
      });
      reload();
      onRestored?.();
    } finally {
      setBusyId(null);
    }
  };

  if (!productId) return null;

  return (
    <section className="rounded-2xl border border-cb-border/80 bg-cb-surface/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-cb-text-strong">
          <Clock className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
          السجل والنسخ
        </h3>
        <div className="flex gap-1 rounded-lg border border-cb-border p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "rounded-md px-2 py-1 font-bold",
              tab === "history" ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50" : "text-cb-text-muted",
            )}
          >
            التعديلات
          </button>
          <button
            type="button"
            onClick={() => setTab("versions")}
            className={cn(
              "rounded-md px-2 py-1 font-bold",
              tab === "versions" ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50" : "text-cb-text-muted",
            )}
          >
            النسخ ({versions.length})
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-3 inline-flex items-center gap-2 text-xs text-cb-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> جاري التحميل…
        </p>
      ) : tab === "history" ? (
        logs.length === 0 ? (
          <p className="mt-2 text-xs text-cb-text-muted">لا سجلات بعد لهذا المنتج.</p>
        ) : (
          <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto">
            {logs.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-cb-border/60 bg-white px-3 py-2 text-xs dark:bg-cb-surface"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-cb-text-strong">{log.summary}</p>
                    <p className="mt-0.5 text-cb-text-muted">
                      {log.actor_email ?? "system"} ·{" "}
                      {format(new Date(log.created_at), "d MMM yyyy · HH:mm", { locale: arEG })}
                    </p>
                  </div>
                  {canWrite && log.can_undo ? (
                    <button
                      type="button"
                      disabled={busyId === log.id}
                      onClick={() => void undoAudit(log.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-300/80 px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-200"
                    >
                      {busyId === log.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Undo2 className="h-3 w-3" />
                      )}
                      تراجع
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : versions.length === 0 ? (
        <p className="mt-2 text-xs text-cb-text-muted">لا نسخ محفوظة بعد — تُنشأ تلقائياً قبل كل تعديل.</p>
      ) : (
        <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto">
          {versions.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-cb-border/60 bg-white px-3 py-2 text-xs dark:bg-cb-surface"
            >
              <div>
                <p className="font-semibold text-cb-text-strong">نسخة #{v.version_number}</p>
                <p className="mt-0.5 text-cb-text-muted">
                  {v.reason ?? "snapshot"} · {v.created_by_email ?? "system"} ·{" "}
                  {format(new Date(v.created_at), "d MMM · HH:mm", { locale: arEG })}
                </p>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  disabled={busyId === v.id}
                  onClick={() => void restoreVersion(v.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-cb-border px-2 py-1 text-[10px] font-bold hover:bg-amber-50 disabled:opacity-50"
                >
                  {busyId === v.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3 w-3" />
                  )}
                  استعادة
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
