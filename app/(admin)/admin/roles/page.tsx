"use client";

import { useEffect, useState } from "react";
import {
  type ModuleKey,
  type PermissionLevel,
  type UserRole,
  getAccessibleModules,
  getPermission,
} from "@/lib/admin/rbac";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

type Matrix = Record<UserRole, Record<ModuleKey, PermissionLevel>>;
type Assignment = {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string | null;
};
type UserOption = {
  id: string;
  email: string;
  full_name?: string | null;
  role?: UserRole;
};

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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function assignRole() {
    setSaving(true);
    setNotice(null);
    setError(null);
    const emailTrim = assignEmail.trim().toLowerCase();
    const payload =
      emailTrim.length > 0
        ? { email: emailTrim, role }
        : selectedUserId
          ? { user_id: selectedUserId, role }
          : null;
    if (!payload) {
      setError("Select a registered user or enter their account email.");
      setSaving(false);
      return;
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
      setNotice("Role assigned successfully. The user will get matching admin navigation and API access on next request.");
      setSelectedUserId("");
      setAssignEmail("");
      const updated = data.assignment;
      if (updated) {
        setAssignments((prev) => {
          const next = prev.filter((x) => x.id !== updated.id);
          return [updated, ...next];
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  function userDisplayName(u: UserOption) {
    const fallback = u.email.split("@")[0];
    return u.full_name?.trim() || fallback;
  }

  return (
    <section className="space-y-5">
      <header className="admin-panel-surface rounded-2xl p-5">
        <h1 className="font-serif text-3xl font-bold text-cb-text-strong">
          Role Management
        </h1>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
          RBAC matrix visibility for owner governance and permission audits.
        </p>
      </header>

      <section className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-5">
        <h2 className="font-serif text-xl font-bold text-cb-text-strong">
          Assign Role by User or Email
        </h2>
        <p className="mt-1 text-sm text-cb-text-muted">
          Owner updates the <code className="rounded bg-cb-surface-2 px-1">users.role</code> row in Supabase. The account must
          exist in the users table (usually after the customer signs up). Role is resolved by{" "}
          <strong>Clerk user id</strong> first, then email — so linking Clerk ↔ Supabase must stay correct.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_0.8fr_auto]">
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              if (e.target.value) setAssignEmail("");
            }}
            aria-label="Select registered user"
            className="rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
          >
            <option value="">Select user (email + username)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {userDisplayName(u)} — {u.email}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
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
            disabled={saving || (!selectedUserId && !assignEmail.trim())}
            onClick={() => void assignRole()}
            className="rounded-xl border border-cb-border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving..." : "Assign"}
          </button>
        </div>
        <label className="mt-4 block text-sm font-semibold text-cb-text-strong">
          Or assign by exact email (must match a row in users)
          <input
            type="email"
            value={assignEmail}
            onChange={(e) => {
              setAssignEmail(e.target.value);
              if (e.target.value.trim()) setSelectedUserId("");
            }}
            placeholder="colleague@company.com"
            className="mt-1 w-full rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
            autoComplete="email"
          />
        </label>
        <div className="mt-4 rounded-xl border border-cb-border bg-cb-surface-2/60 p-4 text-sm text-cb-text">
          <p className="font-semibold text-cb-text-strong">Access preview for selected role: {role}</p>
          <p className="mt-1 text-xs text-cb-text-muted">
            Navigation and APIs use the same matrix. Write actions require <code className="rounded bg-cb-surface px-1">full</code> or{" "}
            <code className="rounded bg-cb-surface px-1">limited</code> on that module.
          </p>
          <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-xs text-cb-text-muted">
            {getAccessibleModules(role).map((m) => (
              <li key={m}>
                <span className="font-mono text-cb-text-strong">{m}</span> — {getPermission(role, m)}
              </li>
            ))}
          </ul>
        </div>
        {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface-elevated">
        <div className="border-b border-cb-border bg-cb-surface-2 px-4 py-3">
          <h2 className="font-semibold text-cb-text-strong">Current Assignments</h2>
        </div>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-cb-surface-2 text-left text-cb-text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-cb-text-muted" colSpan={3}>
                  No owner/admin/staff users found yet.
                </td>
              </tr>
            ) : (
              assignments.map((a) => (
                <tr key={a.id} className="border-t border-cb-border">
                  <td className="px-4 py-3">{a.full_name ?? "-"}</td>
                  <td className="px-4 py-3">{a.email}</td>
                  <td className="px-4 py-3 uppercase">{a.role}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

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

