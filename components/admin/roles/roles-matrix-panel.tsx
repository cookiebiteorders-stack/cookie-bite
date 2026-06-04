"use client";

import type { ModuleKey, UserRole } from "@/lib/admin/rbac";
import { useAdminT } from "@/lib/admin/use-admin-t";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type PermissionLevel = "full" | "limited" | "view" | "none";
type Matrix = Record<UserRole, Record<ModuleKey, PermissionLevel>>;

const levelClass: Record<PermissionLevel, string> = {
  full: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  limited: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  view: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  none: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
};

type Props = {
  modules: ModuleKey[];
  roles: UserRole[];
  matrix: Matrix | null;
  loading: boolean;
  error: string | null;
};

export function RolesMatrixPanel({ modules, roles, matrix, loading, error }: Props) {
  const { adminT, t } = useAdminT();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (loading) {
    return <p className="px-4 py-6 text-sm text-cb-text-muted">{adminT("roles.loading")}</p>;
  }

  if (error) {
    return <p className="px-4 py-6 text-sm text-red-600">{error}</p>;
  }

  if (!isDesktop) {
    return (
      <ul className="flex w-full min-w-0 max-w-full flex-col gap-2 p-4">
        {modules.map((m) => (
          <li
            key={m}
            className="box-border w-full max-w-full rounded-xl border border-cb-border bg-cb-surface/60 p-3"
          >
            <p className="font-semibold text-stone-900">{m}</p>
            <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {roles.map((r) => {
                const level = (matrix?.[r]?.[m] ?? "none") as PermissionLevel;
                return (
                  <div key={`${m}-${r}`} className="min-w-0 rounded-lg border border-cb-border/80 bg-white/80 px-2 py-1.5 dark:bg-stone-900/40">
                    <dt className="truncate text-[10px] font-bold uppercase text-stone-600">
                      {t(`adminRoles.${r}`)}
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={cn(
                          "inline-flex max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-bold uppercase",
                          levelClass[level] ?? levelClass.none,
                        )}
                      >
                        {matrix?.[r]?.[m] ?? "—"}
                      </span>
                    </dd>
                  </div>
                );
              })}
            </dl>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="admin-table-scroll w-full min-w-0 max-w-full">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-cb-surface-2 text-start text-cb-text-muted">
          <tr>
            <th className="px-4 py-3">{adminT("roles.module")}</th>
            {roles.map((r) => (
              <th key={r} className="px-4 py-3 uppercase">
                {t(`adminRoles.${r}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m} className="border-t border-cb-border">
              <td className="px-4 py-3 font-semibold">{m}</td>
              {roles.map((r) => (
                <td key={`${m}-${r}`} className="px-4 py-3">
                  {matrix?.[r]?.[m] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
