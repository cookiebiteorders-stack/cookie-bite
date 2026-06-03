"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Check, Eye, Loader2, Search, Shield, UserPlus, X } from "lucide-react";
import {
  type ModuleKey,
  type UserRole,
} from "@/lib/admin/rbac";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { cn } from "@/lib/utils";

type PermissionLevel = "full" | "limited" | "view" | "none";
type Matrix = Record<UserRole, Record<ModuleKey, PermissionLevel>>;
type Assignment = {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
  avatar_url?: string | null;
  clerk_user_id?: string | null;
};
type UserOption = {
  id: string;
  email: string;
  full_name?: string | null;
  role?: UserRole;
  avatar_url?: string | null;
  clerk_user_id?: string | null;
};

const modules: ModuleKey[] = [
  "dashboard",
  "products",
  "orders",
  "customers",
  "discounts",
  "media",
  "cms",
  "templates",
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
const roleDescriptions: Record<UserRole, string> = {
  owner: "Full governance including security and permissions.",
  admin: "Operational control with full module access.",
  staff: "Limited operational access for daily workflows.",
  customer: "No admin console access.",
};


type Toast = {
  id: string;
  type: "success" | "error" | "info";
  text: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

function roleBadgeClass(role: UserRole) {
  if (role === "owner") return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
  if (role === "admin") return "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200";
  if (role === "staff") return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200";
  return "bg-stone-200 text-stone-800";
}

function permissionBits(level: PermissionLevel) {
  if (level === "full") return { view: true, create: true, update: true, delete: true };
  if (level === "limited") return { view: true, create: false, update: true, delete: false };
  if (level === "view") return { view: true, create: false, update: false, delete: false };
  return { view: false, create: false, update: false, delete: false };
}

export default function AdminRolesPage() {
  const reduceMotion = useReducedMotion();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [role, setRole] = useState<UserRole>("staff");
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);
  const [removingRoleUserId, setRemovingRoleUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [permissionsTargetRole, setPermissionsTargetRole] = useState<UserRole>("staff");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/roles/matrix", { cache: "no-store" });
        const d = (await res.json()) as {
          role_matrix?: Matrix;
          assignments?: Assignment[];
          users?: UserOption[];
          error?: { en?: string };
        };
        if (!res.ok) throw new Error(d.error?.en ?? "Failed to load roles");
        if (!cancelled) {
          setMatrix(d.role_matrix ?? null);
          setAssignments(d.assignments ?? []);
          setUsers(d.users ?? []);
        }
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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 2600);
    return () => clearTimeout(timer);
  }, [toasts]);

  function pushToast(type: Toast["type"], text: string) {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), type, text }]);
  }

  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return users.slice(0, 30);
    return users
      .filter((u) => {
        const name = (u.full_name ?? "").toLowerCase();
        const email = u.email.toLowerCase();
        return name.includes(q) || email.includes(q);
      })
      .slice(0, 30);
  }, [debouncedSearch, users]);

  const selectedResolved = useMemo(() => {
    if (selectedUser) return selectedUser;
    const emailTrim = assignEmail.trim().toLowerCase();
    if (!emailTrim) return null;
    return users.find((u) => u.email.toLowerCase() === emailTrim) ?? null;
  }, [assignEmail, selectedUser, users]);

  async function assignRole() {
    setSaving(true);
    setError(null);
    const emailTrim = assignEmail.trim().toLowerCase();
    const payload =
      emailTrim.length > 0
        ? { email: emailTrim, role }
        : selectedUser?.id
          ? { user_id: selectedUser.id, role }
          : null;
    if (!payload) {
      setError("Select a registered user or enter their account email.");
      pushToast("error", "Select a user first.");
      setSaving(false);
      return;
    }
    if (selectedResolved && selectedResolved.role === role) {
      setError("Role already assigned.");
      pushToast("info", "Role already assigned for this user.");
      setSaving(false);
      return;
    }
    if (selectedResolved?.role && selectedResolved.role !== role) {
      const accepted = window.confirm(
        `This user already has role "${selectedResolved.role}". Replace it with "${role}"?`,
      );
      if (!accepted) {
        setSaving(false);
        return;
      }
    }
    try {
      const res = await fetch("/api/admin/roles/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        assignment?: Assignment;
        error?: { en?: string };
      };
      if (!res.ok) {
        throw new Error(data.error?.en ?? "Failed to assign role");
      }
      pushToast("success", "Role assigned successfully.");
      setSelectedUser(null);
      setAssignEmail("");
      setSearchTerm("");
      setDebouncedSearch("");
      const updated = data.assignment;
      if (updated) {
        setAssignments((prev) => {
          const next = prev.filter((x) => x.id !== updated.id);
          return [updated, ...next];
        });
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      pushToast("error", message);
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(userId: string, nextRole: UserRole) {
    setChangingRoleUserId(userId);
    try {
      const current = assignments.find((a) => a.id === userId);
      if (current?.role === nextRole) {
        pushToast("info", "No changes to apply.");
        return;
      }
      const res = await fetch("/api/admin/roles/matrix", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: nextRole }),
      });
      const data = (await res.json()) as { assignment?: Assignment; error?: { en?: string } };
      if (!res.ok) throw new Error(data.error?.en ?? "Failed to update role");
      if (data.assignment) {
        setAssignments((prev) => prev.map((a) => (a.id === userId ? data.assignment! : a)));
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: data.assignment!.role } : u)));
      }
      pushToast("success", "Role updated.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setChangingRoleUserId(null);
    }
  }

  async function removeRole(userId: string) {
    setRemovingRoleUserId(userId);
    try {
      const res = await fetch(`/api/admin/roles/matrix?user_id=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { assignment?: Assignment; error?: { en?: string } };
      if (!res.ok) throw new Error(data.error?.en ?? "Failed to remove role");
      setAssignments((prev) => prev.filter((a) => a.id !== userId));
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: "customer" } : u)));
      pushToast("success", "Role removed.");
    } catch (err) {
      pushToast("error", err instanceof Error ? err.message : "Failed to remove role");
    } finally {
      setRemovingRoleUserId(null);
    }
  }

  function userDisplayName(u: UserOption) {
    const fallback = u.email.split("@")[0];
    return u.full_name?.trim() || fallback;
  }

  return (
    <section className="space-y-6 pb-10">
      <div className="fixed right-4 top-20 z-50 space-y-2">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm",
              t.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
              t.type === "error" && "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
              t.type === "info" && "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
            )}
          >
            {t.text}
          </motion.div>
        ))}
      </div>

      <motion.header
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-panel-surface rounded-2xl p-5"
      >
        <h1 className="font-serif text-3xl font-bold text-stone-950">
          Role Management
        </h1>
        <p className="mt-2 text-sm text-stone-700">
          Enterprise RBAC control center with assign, preview, and governed updates.
        </p>
      </motion.header>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-950">
            <UserPlus className="h-5 w-5 text-amber-700" />
            Assign Role
          </h2>
          <p className="mt-1 text-sm text-stone-700">
            Search users by email/name, preview profile, then assign with validation against Clerk linkage.
          </p>

          <div className="relative mt-4">
            <div className="inline-flex w-full items-center gap-2 rounded-xl border border-cb-border bg-cb-surface px-3 py-2">
              <Search className="h-4 w-4 text-stone-500" />
              <input
                value={searchTerm}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setAssignEmail("");
                  setSelectedUser(null);
                  setDropdownOpen(true);
                }}
                placeholder="Search user by email or username..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
            {dropdownOpen ? (
              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-cb-border bg-white shadow-sm">
                {filteredUsers.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-stone-600">No users found.</p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setSearchTerm(`${userDisplayName(u)} — ${u.email}`);
                        setDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3 border-b border-cb-border/60 px-3 py-2 text-left hover:bg-cb-surface-2/70"
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={userDisplayName(u)} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cb-surface-2 text-xs font-bold text-stone-700">
                          {initials(userDisplayName(u))}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-stone-900">{userDisplayName(u)}</span>
                        <span className="block truncate text-xs text-stone-600">{u.email}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <label className="mt-3 block text-sm font-semibold text-stone-950">
            Or assign by exact email
            <input
              type="email"
              value={assignEmail}
              onChange={(e) => {
                setAssignEmail(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedUser(null);
                  setSearchTerm("");
                }
              }}
              placeholder="colleague@company.com"
              className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              autoComplete="email"
            />
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select
              value={role}
              onChange={(e) => {
                const r = e.target.value as UserRole;
                setRole(r);
              }}
              className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
              aria-label="Role to assign"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={saving || (!selectedUser && !assignEmail.trim())}
              onClick={() => void assignRole()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-cb-border bg-cb-terracotta-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Assigning..." : "Assign Role"}
            </button>
          </div>

          {selectedResolved ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl border border-cb-border bg-cb-surface-2/70 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-stone-700">Selected user</p>
              <div className="mt-2 flex items-center gap-3">
                {selectedResolved.avatar_url ? (
                  <img src={selectedResolved.avatar_url} alt={userDisplayName(selectedResolved)} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cb-surface text-sm font-bold text-stone-700">
                    {initials(userDisplayName(selectedResolved))}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold text-stone-900">{userDisplayName(selectedResolved)}</p>
                  <p className="text-xs text-stone-600">{selectedResolved.email}</p>
                </div>
                {selectedResolved.role ? (
                  <span className={cn("ms-auto rounded-full px-2 py-1 text-[11px] font-bold", roleBadgeClass(selectedResolved.role))}>
                    current: {selectedResolved.role}
                  </span>
                ) : null}
              </div>
              {!selectedResolved.clerk_user_id ? (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  This user is not linked to Clerk yet.
                </p>
              ) : null}
            </motion.div>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-rose-700">{error}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
          <h2 className="inline-flex items-center gap-2 font-serif text-xl font-bold text-stone-950">
            <Shield className="h-5 w-5 text-amber-700" />
            Permissions Preview
          </h2>
          <p className="mt-1 text-sm text-stone-700">
            Granular module capabilities for selected role.
          </p>
          <select
            value={permissionsTargetRole}
            onChange={(e) => setPermissionsTargetRole(e.target.value as UserRole)}
            className="mt-3 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r} — {roleDescriptions[r]}
              </option>
            ))}
          </select>
          <div className="admin-table-scroll mt-3 rounded-xl border border-cb-border">
            <table className="w-full min-w-[520px] text-xs">
              <thead className="bg-cb-surface-2/80 text-stone-700">
                <tr>
                  <th className="px-2 py-2 text-left">Module</th>
                  <th className="px-2 py-2">View</th>
                  <th className="px-2 py-2">Create</th>
                  <th className="px-2 py-2">Update</th>
                  <th className="px-2 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {modules.map((m) => {
                  const level = matrix?.[permissionsTargetRole]?.[m] ?? "none";
                  const bits = permissionBits(level);
                  const icon = (v: boolean) =>
                    v ? <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" /> : <X className="mx-auto h-3.5 w-3.5 text-stone-400" />;
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
        </section>
      </div>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <div className="flex items-center justify-between border-b border-cb-border bg-cb-surface-2 px-4 py-3">
          <h2 className="font-semibold text-stone-950">Current Assignments</h2>
          <span className="text-xs text-stone-600">{assignments.length} active admin assignments</span>
        </div>
        {assignments.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-stone-800">No roles assigned yet</p>
            <p className="mt-1 text-xs text-stone-600">
              Start by selecting a user and assigning an owner/admin/staff role.
            </p>
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="mt-3 rounded-xl border border-cb-border bg-white px-4 py-2 text-xs font-bold text-stone-800"
            >
              Assign first role
            </button>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-cb-surface-2 text-left text-stone-700">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="border-t border-cb-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {a.avatar_url ? (
                            <img src={a.avatar_url} alt={a.full_name ?? a.email} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cb-surface-2 text-xs font-bold text-stone-700">
                              {initials(a.full_name?.trim() || a.email)}
                            </span>
                          )}
                          <span className="font-semibold text-stone-900">{a.full_name ?? a.email.split("@")[0]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-800">{a.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-1 text-[11px] font-bold uppercase", roleBadgeClass(a.role))}>
                          {a.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={a.role}
                            onChange={(e) => void changeRole(a.id, e.target.value as UserRole)}
                            disabled={changingRoleUserId === a.id}
                            className="rounded-lg border border-cb-border bg-cb-surface px-2 py-1 text-xs"
                          >
                            {roles.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setPermissionsTargetRole(a.role)}
                            className="inline-flex items-center gap-1 rounded-lg border border-cb-border bg-white px-2 py-1 text-xs font-semibold text-stone-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View permissions
                          </button>
                          <button
                            type="button"
                            disabled={removingRoleUserId === a.id}
                            onClick={() => void removeRole(a.id)}
                            className="rounded-lg border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                          >
                            {removingRoleUserId === a.id ? "Removing..." : "Remove role"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {assignments.map((a) => (
                <article key={a.id} className="rounded-xl border border-cb-border bg-cb-surface p-3">
                  <div className="flex items-center gap-2">
                    {a.avatar_url ? (
                      <img src={a.avatar_url} alt={a.full_name ?? a.email} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cb-surface-2 text-xs font-bold">
                        {initials(a.full_name?.trim() || a.email)}
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{a.full_name ?? a.email.split("@")[0]}</p>
                      <p className="text-xs text-stone-600">{a.email}</p>
                    </div>
                    <span className={cn("ms-auto rounded-full px-2 py-1 text-[11px] font-bold uppercase", roleBadgeClass(a.role))}>{a.role}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <select
                      value={a.role}
                      onChange={(e) => void changeRole(a.id, e.target.value as UserRole)}
                      className="w-full rounded-lg border border-cb-border bg-cb-surface px-2 py-2 text-xs"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void removeRole(a.id)}
                      className="w-full rounded-lg border border-rose-300 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                    >
                      Remove role
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <div className="border-b border-cb-border bg-cb-surface-2 px-4 py-3">
          <h2 className="font-semibold text-stone-950">Role Matrix</h2>
          <p className="mt-1 text-xs text-cb-text-muted lg:hidden">
            اسحب أفقياً لعرض كل الأدوار
          </p>
        </div>
        <div className="admin-table-scroll">
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
      </div>
    </section>
  );
}

