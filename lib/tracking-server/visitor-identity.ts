import type { SupabaseClient } from "@supabase/supabase-js";

export type VisitorPresenceType = "guest" | "customer" | "staff" | "admin" | "owner";

export type UserIdentityRow = {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export type ResolvedVisitorIdentity = {
  visitor_type: VisitorPresenceType;
  display_name: string | null;
  email: string | null;
  user_db_id: string | null;
  clerk_user_id: string | null;
  session_label: string;
};

export function resolveVisitorType(role: string | null | undefined): VisitorPresenceType {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "staff") return "staff";
  if (role === "customer") return "customer";
  return "guest";
}

export function buildGuestSessionLabel(input: {
  visitor_id?: string | null;
  device_type?: string | null;
  browser?: string | null;
  city?: string | null;
  country?: string | null;
}): string {
  const geo = [input.city, input.country].filter(Boolean).join(", ");
  const device = [input.device_type, input.browser].filter(Boolean).join(" · ");
  const hint = [device, geo].filter(Boolean).join(" · ");
  const shortId = String(input.visitor_id ?? "").slice(0, 10);
  return hint ? `${hint} · #${shortId}` : `#${shortId}`;
}

export function buildSessionLabel(
  identity: Omit<ResolvedVisitorIdentity, "session_label">,
  guestFallback: string,
): string {
  if (identity.display_name?.trim()) {
    const email = identity.email?.trim();
    return email && !identity.display_name.includes("@")
      ? `${identity.display_name.trim()} (${email})`
      : identity.display_name.trim();
  }
  if (identity.email?.trim()) return identity.email.trim();
  return guestFallback;
}

export function resolveIdentityFromUser(
  user: UserIdentityRow | null | undefined,
  guestFallback: string,
): ResolvedVisitorIdentity {
  if (!user) {
    return {
      visitor_type: "guest",
      display_name: null,
      email: null,
      user_db_id: null,
      clerk_user_id: null,
      session_label: guestFallback,
    };
  }

  const base = {
    visitor_type: resolveVisitorType(user.role),
    display_name: user.full_name?.trim() || null,
    email: user.email?.trim() || null,
    user_db_id: user.id,
    clerk_user_id: user.clerk_user_id,
  };

  return {
    ...base,
    session_label: buildSessionLabel(base, guestFallback),
  };
}

export async function resolveDbUserId(
  supabase: SupabaseClient,
  authUserId: string | null | undefined,
): Promise<string | null> {
  const id = typeof authUserId === "string" ? authUserId.trim() : "";
  if (!id) return null;

  const { data: byId } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (byId?.id) return String(byId.id);

  const { data: byLegacyClerk } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_user_id", id)
    .maybeSingle();
  return byLegacyClerk?.id ? String(byLegacyClerk.id) : null;
}

export async function loadUsersByDbIds(
  supabase: SupabaseClient,
  dbUserIds: string[],
): Promise<Map<string, UserIdentityRow>> {
  const ids = [...new Set(dbUserIds.filter(Boolean))];
  const map = new Map<string, UserIdentityRow>();
  if (ids.length === 0) return map;

  const { data } = await supabase
    .from("users")
    .select("id, clerk_user_id, email, full_name, role")
    .in("id", ids);

  for (const row of data ?? []) {
    map.set(String(row.id), row as UserIdentityRow);
  }
  return map;
}

export async function loadUsersByClerkIds(
  supabase: SupabaseClient,
  clerkIds: string[],
): Promise<Map<string, UserIdentityRow>> {
  const ids = [...new Set(clerkIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, UserIdentityRow>();
  if (ids.length === 0) return map;

  const { data } = await supabase
    .from("users")
    .select("id, clerk_user_id, email, full_name, role")
    .in("clerk_user_id", ids);

  for (const row of data ?? []) {
    map.set(String(row.clerk_user_id), row as UserIdentityRow);
  }
  return map;
}
