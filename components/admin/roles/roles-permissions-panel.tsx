"use client";

import { Check, X } from "lucide-react";
import type { ModuleKey, UserRole } from "@/lib/admin/rbac";
import { useAdminT } from "@/lib/admin/use-admin-t";
import { useMediaQuery } from "@/hooks/use-media-query";

type PermissionLevel = "full" | "limited" | "view" | "none";
type Matrix = Record<UserRole, Record<ModuleKey, PermissionLevel>>;

function permissionBits(level: PermissionLevel) {
  if (level === "full") return { view: true, create: true, update: true, delete: true };
  if (level === "limited") return { view: true, create: false, update: true, delete: false };
  if (level === "view") return { view: true, create: false, update: false, delete: false };
  return { view: false, create: false, update: false, delete: false };
}

type Props = {
  modules: ModuleKey[];
  matrix: Matrix | null;
  targetRole: UserRole;
};

export function RolesPermissionsPanel({ modules, matrix, targetRole }: Props) {
  const { adminT } = useAdminT();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const icon = (v: boolean) =>
    v ? <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <X className="mx-auto h-3.5 w-3.5 text-stone-400" aria-hidden />;

  if (!isDesktop) {
    return (
      <ul className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-2">
        {modules.map((m) => {
          const level = matrix?.[targetRole]?.[m] ?? "none";
          const bits = permissionBits(level);
          return (
            <li
              key={m}
              className="box-border w-full max-w-full rounded-xl border border-cb-border bg-cb-surface/60 p-3"
            >
              <p className="font-semibold text-stone-800">{m}</p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-stone-600">
                <div>
                  <p>{adminT("roles.view")}</p>
                  <div className="mt-1">{icon(bits.view)}</div>
                </div>
                <div>
                  <p>{adminT("roles.create")}</p>
                  <div className="mt-1">{icon(bits.create)}</div>
                </div>
                <div>
                  <p>{adminT("roles.update")}</p>
                  <div className="mt-1">{icon(bits.update)}</div>
                </div>
                <div>
                  <p>{adminT("roles.delete")}</p>
                  <div className="mt-1">{icon(bits.delete)}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="admin-table-scroll mt-3 w-full min-w-0 max-w-full rounded-xl border border-cb-border">
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[16.5%]" />
          <col className="w-[16.5%]" />
          <col className="w-[16.5%]" />
          <col className="w-[16.5%]" />
        </colgroup>
        <thead className="bg-cb-surface-2/80 text-stone-700">
          <tr>
            <th className="px-2 py-2 text-start">{adminT("roles.module")}</th>
            <th className="px-2 py-2 text-center">{adminT("roles.view")}</th>
            <th className="px-2 py-2 text-center">{adminT("roles.create")}</th>
            <th className="px-2 py-2 text-center">{adminT("roles.update")}</th>
            <th className="px-2 py-2 text-center">{adminT("roles.delete")}</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => {
            const level = matrix?.[targetRole]?.[m] ?? "none";
            const bits = permissionBits(level);
            return (
              <tr key={m} className="border-t border-cb-border">
                <td className="px-2 py-2 font-semibold text-stone-800">{m}</td>
                <td className="px-2 py-2 text-center">{icon(bits.view)}</td>
                <td className="px-2 py-2 text-center">{icon(bits.create)}</td>
                <td className="px-2 py-2 text-center">{icon(bits.update)}</td>
                <td className="px-2 py-2 text-center">{icon(bits.delete)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
