import { newCustomerStaffAlert } from "@/lib/email/templates";
import { isEmailConfigured } from "@/lib/email/resend";
import { sendInternalEmail } from "@/lib/email/send";
import type { UserRow } from "@/lib/db/types";
import { listOwnerAndAdminEmails } from "@/lib/notifications/staff-recipients";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type CustomerAddressSnapshot = {
  label?: string | null;
  recipient?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  city?: string | null;
  governorate?: string | null;
  delivery_notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type AlertKind = "signup" | "profile_complete";

const CLAIM_COLUMN: Record<AlertKind, "staff_signup_alert_sent_at" | "staff_profile_alert_sent_at"> =
  {
    signup: "staff_signup_alert_sent_at",
    profile_complete: "staff_profile_alert_sent_at",
  };

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://cookie-bite.com").replace(/\/$/, "");
}

function displayName(user: UserRow): string {
  return (
    user.full_name_en?.trim() ||
    user.full_name_ar?.trim() ||
    user.full_name?.trim() ||
    user.email
  );
}

function formatAddressLine(addr: CustomerAddressSnapshot): string {
  const parts = [
    addr.street,
    addr.building ? `Bldg ${addr.building}` : null,
    addr.floor ? `Floor ${addr.floor}` : null,
    addr.apartment ? `Apt ${addr.apartment}` : null,
    [addr.city, addr.governorate].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.join(" · ") || "—";
}

function buildRows(
  user: UserRow,
  kind: AlertKind,
  extras?: { clerkUsername?: string | null; address?: CustomerAddressSnapshot | null },
) {
  const rows: { label: string; value: string }[] = [
    { label: "Email", value: user.email },
    { label: "Name (EN)", value: user.full_name_en ?? user.full_name ?? "—" },
    { label: "Name (AR)", value: user.full_name_ar ?? "—" },
    { label: "User ID", value: user.id },
    { label: "Clerk ID", value: user.clerk_user_id ?? "—" },
    { label: "Role", value: user.role },
    { label: "Signed up", value: new Date(user.created_at).toLocaleString("en-GB", { timeZone: "Africa/Cairo" }) },
  ];

  if (extras?.clerkUsername) {
    rows.push({ label: "Username", value: extras.clerkUsername });
  }

  if (kind === "profile_complete") {
    rows.push(
      { label: "Mobile", value: user.phone ?? "—" },
      { label: "Secondary phone", value: user.phone_secondary ?? "—" },
      { label: "Profile notes", value: user.profile_notes ?? "—" },
      {
        label: "Profile completed",
        value: user.profile_completed_at
          ? new Date(user.profile_completed_at).toLocaleString("en-GB", {
              timeZone: "Africa/Cairo",
            })
          : "—",
      },
    );
    const addr = extras?.address;
    if (addr) {
      rows.push(
        { label: "Address label", value: addr.label ?? "Home" },
        { label: "Recipient", value: addr.recipient ?? "—" },
        { label: "Address phone", value: addr.phone ?? "—" },
        { label: "Address phone 2", value: addr.phone_secondary ?? "—" },
        { label: "Street / area", value: formatAddressLine(addr) },
        { label: "Driver notes", value: addr.delivery_notes ?? "—" },
      );
      if (addr.latitude != null && addr.longitude != null) {
        const maps = `https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`;
        rows.push({
          label: "GPS",
          value: `${addr.latitude.toFixed(6)}, ${addr.longitude.toFixed(6)}\n${maps}`,
        });
      }
    }
  }

  return rows;
}

async function claimStaffAlert(
  userId: string,
  kind: AlertKind,
  force?: boolean,
): Promise<boolean> {
  if (force) return true;
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return false;

  const column = CLAIM_COLUMN[kind];
  const { data, error } = await supabase
    .from("users")
    .update({ [column]: new Date().toISOString() })
    .eq("id", userId)
    .is(column, null)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(`claimStaffAlert ${kind}`, error);
    return false;
  }
  return Boolean(data);
}

async function rollbackClaim(userId: string, kind: AlertKind): Promise<void> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return;
  const column = CLAIM_COLUMN[kind];
  await supabase.from("users").update({ [column]: null }).eq("id", userId);
}

/**
 * Emails every owner & admin when a new customer signs up or completes their profile.
 */
export async function tryNotifyStaffNewCustomer(opts: {
  kind: AlertKind;
  user: UserRow;
  address?: CustomerAddressSnapshot | null;
  clerkUsername?: string | null;
  force?: boolean;
}): Promise<{ sent: number; reason?: string }> {
  if (opts.user.role !== "customer") {
    return { sent: 0, reason: "not_customer" };
  }
  if (!isEmailConfigured()) {
    return { sent: 0, reason: "resend_not_configured" };
  }

  const recipients = await listOwnerAndAdminEmails();
  if (recipients.length === 0) {
    return { sent: 0, reason: "no_staff_recipients" };
  }

  const claimed = await claimStaffAlert(opts.user.id, opts.kind, opts.force);
  if (!claimed) {
    return { sent: 0, reason: "already_sent" };
  }

  const name = displayName(opts.user);
  const adminUrl = `${appBaseUrl()}/admin/customers`;
  const tpl = newCustomerStaffAlert({
    kind: opts.kind,
    displayName: name,
    rows: buildRows(opts.user, opts.kind, {
      clerkUsername: opts.clerkUsername,
      address: opts.address,
    }),
    adminUrl,
  });

  let sent = 0;
  const failures: string[] = [];

  for (const to of recipients) {
    try {
      await sendInternalEmail({ to, subject: tpl.subject, html: tpl.html });
      sent += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "send_failed";
      failures.push(`${to}: ${msg}`);
      console.error(`staff new customer alert → ${to}`, err);
    }
  }

  if (sent === 0) {
    await rollbackClaim(opts.user.id, opts.kind);
    return { sent: 0, reason: failures.join("; ") || "all_failed" };
  }

  return { sent };
}
