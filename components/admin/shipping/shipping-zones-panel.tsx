"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import { motion, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  Copy,
  Download,
  GripVertical,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import type { ShippingZoneRow } from "@/lib/shipping/types";
import { zonesToCsv, parseZonesCsv } from "@/lib/shipping/csv-zones";
import { useShippingOrchestrationStore } from "@/stores/shipping-orchestration-store";
import { cn } from "@/lib/utils";

const columnHelper = createColumnHelper<ShippingZoneRow>();

type SortKey = "priority" | "name" | "fee" | "eta";

function sortZones(list: ShippingZoneRow[], key: SortKey, orderIds: string[]): ShippingZoneRow[] {
  if (key === "priority") {
    const map = new Map(list.map((z) => [z.id, z]));
    return orderIds.map((id) => map.get(id)).filter(Boolean) as ShippingZoneRow[];
  }
  const copy = [...list];
  if (key === "name") copy.sort((a, b) => a.name.localeCompare(b.name));
  if (key === "fee") copy.sort((a, b) => a.base_fee_egp - b.base_fee_egp);
  if (key === "eta") copy.sort((a, b) => a.eta_min_days - b.eta_min_days || a.eta_max_days - b.eta_max_days);
  return copy;
}

function CitiesCell({ cities }: { cities: string[] }) {
  const [open, setOpen] = useState(false);
  const shown = cities.slice(0, 2);
  const more = cities.length - shown.length;
  return (
    <div className="max-w-[220px]">
      <button
        type="button"
        className="text-start text-xs text-cb-text"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="font-medium text-cb-text-strong">{shown.join(", ")}</span>
        {more > 0 && (
          <span className="ms-1 rounded-full bg-cb-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-cb-text-muted">
            +{more} more
          </span>
        )}
      </button>
      {open && (
        <ul className="mt-1 max-h-28 overflow-auto rounded-lg border border-cb-border bg-cb-surface p-2 text-xs text-cb-text">
          {cities.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ShippingZonesPanel() {
  const reduceMotion = useReducedMotion();
  const zones = useShippingOrchestrationStore((s) => s.zones);
  const loading = useShippingOrchestrationStore((s) => s.loading);
  const error = useShippingOrchestrationStore((s) => s.error);
  const mutating = useShippingOrchestrationStore((s) => s.mutating);
  const loadZones = useShippingOrchestrationStore((s) => s.loadZones);
  const updateZone = useShippingOrchestrationStore((s) => s.updateZone);
  const deleteZone = useShippingOrchestrationStore((s) => s.deleteZone);
  const createZone = useShippingOrchestrationStore((s) => s.createZone);
  const reorderZones = useShippingOrchestrationStore((s) => s.reorderZones);
  const importRows = useShippingOrchestrationStore((s) => s.importRows);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [feeMin, setFeeMin] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("priority");

  const sortedIds = useMemo(() => {
    return [...zones]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((z) => z.id);
  }, [zones]);

  const idsKey = sortedIds.join("|");
  const prevKey = useRef("");
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (idsKey !== prevKey.current) {
      prevKey.current = idsKey;
      setOrder(sortedIds);
    }
  }, [idsKey, sortedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = zones;
    if (status === "active") rows = rows.filter((z) => z.is_active);
    if (status === "inactive") rows = rows.filter((z) => !z.is_active);
    if (q) {
      rows = rows.filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          z.cities.some((c) => c.toLowerCase().includes(q)),
      );
    }
    const min = feeMin === "" ? null : Number(feeMin);
    const max = feeMax === "" ? null : Number(feeMax);
    if (min != null && Number.isFinite(min)) rows = rows.filter((z) => z.base_fee_egp >= min);
    if (max != null && Number.isFinite(max)) rows = rows.filter((z) => z.base_fee_egp <= max);
    return rows;
  }, [zones, search, status, feeMin, feeMax]);

  const displayZones = useMemo(() => {
    const ids = sortKey === "priority" ? order.filter((id) => filtered.some((z) => z.id === id)) : null;
    if (sortKey === "priority" && ids?.length) {
      const map = new Map(filtered.map((z) => [z.id, z]));
      return ids.map((id) => map.get(id)).filter(Boolean) as ShippingZoneRow[];
    }
    return sortZones(filtered, sortKey, order);
  }, [filtered, sortKey, order]);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ShippingZoneRow> | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reorderUnlocked =
    sortKey === "priority" &&
    filtered.length === zones.length &&
    feeMin === "" &&
    feeMax === "" &&
    status === "all" &&
    !search.trim();

  const beginEdit = (z: ShippingZoneRow) => {
    setEditingId(z.id);
    setDraft({ ...z, cities: [...z.cities] });
  };

  const saveEdit = useCallback(async () => {
    if (!editingId || !draft) return;
    const name = (draft.name ?? "").trim();
    const cities = (draft.cities ?? []).map((c) => c.trim()).filter(Boolean);
    if (name.length < 2) {
      window.alert("Zone name must be at least 2 characters.");
      return;
    }
    if (!cities.length) {
      window.alert("Add at least one city.");
      return;
    }
    const emin = Math.max(0, Math.floor(Number(draft.eta_min_days ?? 0)));
    const emax = Math.max(0, Math.floor(Number(draft.eta_max_days ?? 0)));
    if (emax < emin) {
      window.alert("ETA max must be greater than or equal to min.");
      return;
    }
    const patch = {
      name,
      cities,
      base_fee_egp: Math.max(0, Number(draft.base_fee_egp ?? 0)),
      free_shipping_threshold_egp: draft.free_shipping_threshold_egp ?? null,
      eta_min_days: emin,
      eta_max_days: Math.max(emin, emax),
      is_active: Boolean(draft.is_active),
    };
    await updateZone(editingId, patch);
    setEditingId(null);
    setDraft(null);
  }, [draft, editingId, updateZone]);

  const duplicate = useCallback(async (z: ShippingZoneRow) => {
    let name = `${z.name} (copy)`;
    let n = 2;
    const currentZones = useShippingOrchestrationStore.getState().zones;
    const lower = currentZones.map((x) => x.name.toLowerCase());
    while (lower.includes(name.toLowerCase())) {
      name = `${z.name} (copy ${n})`;
      n++;
    }
    await createZone({
      name,
      cities: [...z.cities],
      base_fee_egp: z.base_fee_egp,
      free_shipping_threshold_egp: z.free_shipping_threshold_egp,
      eta_min_days: z.eta_min_days,
      eta_max_days: z.eta_max_days,
      is_active: z.is_active,
    });
  }, [createZone]);

  const onDelete = useCallback(async (id: string, name: string) => {
    if (!window.confirm(`Delete zone "${name}"? This cannot be undone.`)) return;
    await deleteZone(id);
  }, [deleteZone]);

  const onDropReorder = (targetId: string, sourceId: string) => {
    if (!reorderUnlocked || sourceId === targetId) return;
    const visibleIds = displayZones.map((z) => z.id);
    const from = visibleIds.indexOf(sourceId);
    const to = visibleIds.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...order];
    const fullIdx = (id: string) => next.indexOf(id);
    const fi = fullIdx(sourceId);
    const ti = fullIdx(targetId);
    if (fi < 0 || ti < 0) return;
    const [item] = next.splice(fi, 1);
    next.splice(ti, 0, item);
    setOrder(next);
    void reorderZones(next);
  };

  const bulkDelete = async () => {
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} zone(s)?`)) return;
    for (const id of ids) {
      await deleteZone(id);
    }
    setRowSelection({});
  };

  const bulkSetActive = async (active: boolean) => {
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    if (!ids.length) return;
    for (const id of ids) {
      await updateZone(id, { is_active: active });
    }
    setRowSelection({});
  };

  const exportCsv = () => {
    const blob = new Blob([zonesToCsv(zones)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipping-zones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = parseZonesCsv(text);
    if (!parsed.ok) {
      window.alert(parsed.error);
      return;
    }
    await importRows(parsed.rows);
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-cb-border"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-cb-border"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Select row"
          />
        ),
        size: 36,
      }),
      columnHelper.display({
        id: "drag",
        header: () => <span className="sr-only">Reorder</span>,
        cell: ({ row }) =>
          reorderUnlocked ? (
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-zone-id", row.original.id);
                e.dataTransfer.effectAllowed = "move";
                setDragId(row.original.id);
              }}
              onDragEnd={() => setDragId(null)}
              className="cursor-grab rounded p-1 text-cb-text-muted hover:bg-cb-hover-overlay active:cursor-grabbing"
              aria-label="Drag to reorder priority"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : (
            <span className="inline-block w-6 text-[10px] text-cb-text-muted" title="Clear filters to reorder">
              —
            </span>
          ),
      }),
      columnHelper.accessor("name", {
        header: "Zone",
        cell: (ctx) => {
          const z = ctx.row.original;
          if (editingId === z.id && draft) {
            return (
              <input
                className="w-full min-w-[120px] rounded-lg border border-cb-border bg-cb-surface px-2 py-1 text-xs"
                value={draft.name ?? ""}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                }
              />
            );
          }
          return <span className="font-semibold text-cb-text-strong">{z.name}</span>;
        },
      }),
      columnHelper.display({
        id: "cities",
        header: "Cities",
        cell: (ctx) =>
          editingId === ctx.row.original.id && draft ? (
            <textarea
              className="min-h-[60px] w-full rounded-lg border border-cb-border bg-cb-surface px-2 py-1 text-xs"
              value={(draft.cities ?? []).join(", ")}
                onChange={(e) =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        cities: e.target.value
                          .split(/[,;\n]+/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }
                    : d,
                )
              }
            />
          ) : (
            <CitiesCell cities={ctx.row.original.cities} />
          ),
      }),
      columnHelper.accessor("base_fee_egp", {
        header: "Base (EGP)",
        cell: (ctx) => {
          const z = ctx.row.original;
          if (editingId === z.id && draft) {
            return (
              <input
                type="number"
                min={0}
                className="w-20 rounded-lg border border-cb-border bg-cb-surface px-2 py-1 text-xs"
                value={draft.base_fee_egp ?? 0}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, base_fee_egp: Number(e.target.value) } : d,
                  )
                }
              />
            );
          }
          return <span className="tabular-nums">{z.base_fee_egp}</span>;
        },
      }),
      columnHelper.accessor("free_shipping_threshold_egp", {
        header: "Free ≥",
        cell: (ctx) => {
          const z = ctx.row.original;
          if (editingId === z.id && draft) {
            return (
              <input
                type="number"
                min={0}
                className="w-20 rounded-lg border border-cb-border bg-cb-surface px-2 py-1 text-xs"
                value={draft.free_shipping_threshold_egp ?? ""}
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          free_shipping_threshold_egp: v === "" ? null : Number(v),
                        }
                      : d,
                  );
                }}
              />
            );
          }
          return (
            <span className="text-cb-text-muted">
              {z.free_shipping_threshold_egp != null ? z.free_shipping_threshold_egp : "—"}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "eta",
        header: "ETA",
        cell: (ctx) => {
          const z = ctx.row.original;
          if (editingId === z.id && draft) {
            return (
              <div className="flex gap-1">
                <input
                  type="number"
                  className="w-12 rounded border border-cb-border px-1 text-xs"
                  value={draft.eta_min_days ?? 0}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, eta_min_days: Number(e.target.value) } : d,
                    )
                  }
                />
                <span className="text-cb-text-muted">–</span>
                <input
                  type="number"
                  className="w-12 rounded border border-cb-border px-1 text-xs"
                  value={draft.eta_max_days ?? 0}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, eta_max_days: Number(e.target.value) } : d,
                    )
                  }
                />
              </div>
            );
          }
          return (
            <span className="tabular-nums text-xs">
              {z.eta_min_days}–{z.eta_max_days}d
            </span>
          );
        },
      }),
      columnHelper.accessor("is_active", {
        header: "Status",
        cell: (ctx) => {
          const z = ctx.row.original;
          if (editingId === z.id && draft) {
            return (
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(draft.is_active)}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, is_active: e.target.checked } : d,
                    )
                  }
                />
                Active
              </label>
            );
          }
          return (
            <button
              type="button"
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
                z.is_active
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                  : "bg-cb-surface-2 text-cb-text-muted",
              )}
              onClick={() => void updateZone(z.id, { is_active: !z.is_active })}
            >
              {z.is_active ? "Active" : "Off"}
            </button>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (ctx) => {
          const z = ctx.row.original;
          if (editingId === z.id) {
            return (
              <div className="flex flex-wrap justify-end gap-1">
                <button
                  type="button"
                  className="rounded-lg bg-cb-terracotta-dark px-2 py-1 text-[11px] font-bold text-white"
                  onClick={() => void saveEdit()}
                  disabled={mutating}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-cb-border px-2 py-1 text-[11px] font-semibold"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            );
          }
          return (
            <div className="flex flex-wrap justify-end gap-0.5">
              <button
                type="button"
                className="rounded-lg p-1.5 text-cb-text hover:bg-cb-hover-overlay"
                title="Edit inline"
                onClick={() => beginEdit(z)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-cb-text hover:bg-cb-hover-overlay"
                title="Duplicate"
                onClick={() => void duplicate(z)}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                title="Delete"
                onClick={() => void onDelete(z.id, z.name)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      }),
    ],
    [editingId, draft, mutating, reorderUnlocked, duplicate, onDelete, saveEdit, updateZone],
  );

  /* eslint-disable react-hooks/incompatible-library -- TanStack Table returns non-memoizable helpers */
  const table = useReactTable({
    data: displayZones,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });
  /* eslint-enable react-hooks/incompatible-library */

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  const skeleton = loading && !zones.length;

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.08 }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
            Search
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zone or city…"
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
            Fee min (EGP)
            <input
              value={feeMin}
              onChange={(e) => setFeeMin(e.target.value)}
              type="number"
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
            Fee max (EGP)
            <input
              value={feeMax}
              onChange={(e) => setFeeMax(e.target.value)}
              type="number"
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Sort</span>
          {(["priority", "name", "fee", "eta"] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSortKey(k)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold capitalize",
                sortKey === k
                  ? "bg-cb-terracotta-dark text-white"
                  : "border border-cb-border bg-cb-surface text-cb-text",
              )}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void loadZones()}
          className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-xs font-bold"
        >
          <Upload className="h-3.5 w-3.5" />
          Import CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void onCsv(e)} />
        {selectedCount > 0 && (
          <>
            <span className="text-xs text-stone-700 dark:text-stone-300">{selectedCount} selected</span>
            <button
              type="button"
              className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
              onClick={() => void bulkSetActive(true)}
            >
              Activate
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-700 px-3 py-2 text-xs font-bold text-white"
              onClick={() => void bulkSetActive(false)}
            >
              Deactivate
            </button>
            <button
              type="button"
              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white"
              onClick={() => void bulkDelete()}
            >
              Delete
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100">
          {error}
        </div>
      )}

      {skeleton ? (
        <div className="space-y-2 rounded-2xl border border-cb-border p-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-cb-surface-2" />
          ))}
        </div>
      ) : displayZones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cb-border bg-cb-surface/50 p-10 text-center text-sm text-stone-700 dark:text-stone-300">
          No zones match your filters. Adjust search or add a new zone.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-cb-border bg-cb-surface-elevated md:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-cb-border bg-cb-surface-2/80 text-xs font-bold uppercase tracking-wide text-stone-700 dark:text-stone-300">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-3 py-3" style={{ width: h.getSize() }}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData("application/x-zone-id");
                  const tr = (e.target as HTMLElement).closest("tr[data-zone-row]");
                  const to = tr?.getAttribute("data-zone-id");
                  if (from && to) onDropReorder(to, from);
                }}
              >
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-zone-row
                    data-zone-id={row.original.id}
                    className={cn(
                      "border-t border-cb-border transition-colors",
                      dragId === row.original.id && "bg-cb-mint/10",
                      row.getIsSelected() && "bg-cb-peach/15",
                      "hover:bg-cb-hover-overlay/60",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {displayZones.map((z) => (
              <div
                key={z.id}
                className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-sm"
                data-zone-id={z.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData("application/x-zone-id");
                  if (from) onDropReorder(z.id, from);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-serif font-bold text-cb-text-strong">{z.name}</p>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {z.cities.slice(0, 4).join(", ")}
                      {z.cities.length > 4 ? ` +${z.cities.length - 4}` : ""}
                    </p>
                  </div>
                  {reorderUnlocked && (
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("application/x-zone-id", z.id);
                        setDragId(z.id);
                      }}
                      onDragEnd={() => setDragId(null)}
                      className="text-cb-text-muted"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-cb-text-muted">Base</dt>
                    <dd className="font-semibold">EGP {z.base_fee_egp}</dd>
                  </div>
                  <div>
                    <dt className="text-cb-text-muted">ETA</dt>
                    <dd className="font-semibold">
                      {z.eta_min_days}–{z.eta_max_days}d
                    </dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-cb-border px-2 py-1 text-xs font-bold"
                    onClick={() => beginEdit(z)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-cb-border px-2 py-1 text-xs font-bold"
                    onClick={() => void duplicate(z)}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-700"
                    onClick={() => void onDelete(z.id, z.name)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {sortKey === "priority" && (
        <p className="text-[11px] text-cb-text-muted">
          <ChevronDown className="me-1 inline h-3 w-3" aria-hidden />
          {reorderUnlocked
            ? "Drag the handle to change checkout priority. Other sort modes are view-only."
            : "Clear search and filters to enable drag-and-drop priority reorder for all zones."}
        </p>
      )}
    </motion.section>
  );
}
