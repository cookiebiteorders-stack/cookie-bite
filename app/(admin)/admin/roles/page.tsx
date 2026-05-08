"use client";

import { useEffect, useState } from "react";
import type { ModuleKey, PermissionLevel, UserRole } from "@/lib/admin/rbac";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Matrix = Record<UserRole, Record<ModuleKey, PermissionLevel>>;

const modules: ModuleKey[] = [
  "dashboard",
  "products",
  "orders",
  "customers",
  "discounts",
  "media",
  "cms",
  "analytics",
  "financial",
  "invoices",
  "shipping",
  "payments",
  "roles",
  "settings",
  "audit",
];

const roles: UserRole[] = ["owner", "admin", "staff", "customer"];

export default function AdminRolesPage() {
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/roles/matrix", { cache: "no-store" });
        const d = (await res.json()) as { role_matrix?: Matrix; error?: { en?: string } };
        if (!res.ok) throw new Error(d.error?.en ?? "Failed to load roles");
        if (!cancelled) setMatrix(d.role_matrix ?? null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const cancelSchedule = scheduleEffectTask(() => {
      void load();
    });
    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, []);

  return (
    <section className="space-y-5">
      <header className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Role Management
        </h1>
        <p className="mt-2 text-sm text-cb-text">
          RBAC matrix visibility for owner governance and permission audits.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
            <tr>
              <th className="px-4 py-3">Module</th>
              {roles.map((r) => (
                <th key={r} className="px-4 py-3 uppercase">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-3 text-cb-text-muted" colSpan={roles.length + 1}>
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td className="px-4 py-3 text-red-600" colSpan={roles.length + 1}>
                  {error}
                </td>
              </tr>
            ) : (
              modules.map((m) => (
                <tr key={m} className="border-t border-cb-border">
                  <td className="px-4 py-3 font-semibold">{m}</td>
                  {roles.map((r) => (
                    <td key={`${m}-${r}`} className="px-4 py-3">
                      {matrix?.[r]?.[m] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

