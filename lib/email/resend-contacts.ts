import { getResend, isEmailConfigured } from "@/lib/email/resend";

export type ResendContactRecord = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  unsubscribed: boolean;
  created_at?: string;
};

type ResendResult<T> = { data: T | null; error: { message: string } | null };

function unwrap<T>(result: ResendResult<T>, fallback = "Resend API error"): T {
  if (result.error) throw new Error(result.error.message || fallback);
  if (result.data == null) throw new Error(fallback);
  return result.data;
}

function segmentIdsFromEnv(): { id: string }[] | undefined {
  const id = process.env.RESEND_SEGMENT_ID?.trim();
  return id ? [{ id }] : undefined;
}

function audienceIdFromEnv(): string | undefined {
  return process.env.RESEND_AUDIENCE_ID?.trim() || undefined;
}

export function isResendContactsAvailable(): boolean {
  return isEmailConfigured();
}

/** Create contact (Resend global API or legacy audience). */
export async function createResendContact(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
  properties?: Record<string, string | number | null>;
}) {
  const resend = getResend();
  const email = input.email.trim().toLowerCase();
  const audienceId = audienceIdFromEnv();

  if (audienceId) {
    const result = await resend.contacts.create({
      audienceId,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      unsubscribed: input.unsubscribed ?? false,
      properties: input.properties,
    });
    return unwrap(result, "Failed to create contact");
  }

  const result = await resend.contacts.create({
    email,
    firstName: input.firstName,
    lastName: input.lastName,
    unsubscribed: input.unsubscribed ?? false,
    properties: input.properties,
    segments: segmentIdsFromEnv(),
  });
  return unwrap(result, "Failed to create contact");
}

export async function getResendContact(ref: { id?: string; email?: string }) {
  const resend = getResend();
  const audienceId = audienceIdFromEnv();

  if (ref.id) {
    const result = audienceId
      ? await resend.contacts.get({ id: ref.id, audienceId })
      : await resend.contacts.get(ref.id);
    return unwrap(result, "Contact not found");
  }
  if (ref.email) {
    const result = audienceId
      ? await resend.contacts.get({ email: ref.email.trim().toLowerCase(), audienceId })
      : await resend.contacts.get({ email: ref.email.trim().toLowerCase() });
    return unwrap(result, "Contact not found");
  }
  throw new Error("id or email required");
}

export async function updateResendContact(input: {
  id?: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  unsubscribed?: boolean;
  properties?: Record<string, string | number | null>;
}) {
  const resend = getResend();
  const audienceId = audienceIdFromEnv();
  const fields = {
    audienceId,
    firstName: input.firstName,
    lastName: input.lastName,
    unsubscribed: input.unsubscribed,
    properties: input.properties,
  };
  if (!input.id && !input.email) throw new Error("id or email required");
  const result = input.id
    ? await resend.contacts.update({ id: input.id, ...fields })
    : await resend.contacts.update({
        email: input.email!.trim().toLowerCase(),
        ...fields,
      });
  return unwrap(result, "Failed to update contact");
}

export async function removeResendContact(ref: { id?: string; email?: string }) {
  const resend = getResend();
  const audienceId = audienceIdFromEnv();

  if (ref.id) {
    const result = audienceId
      ? await resend.contacts.remove({ id: ref.id, audienceId })
      : await resend.contacts.remove(ref.id);
    return unwrap(result, "Failed to delete contact");
  }
  if (ref.email) {
    const result = audienceId
      ? await resend.contacts.remove({ email: ref.email.trim().toLowerCase(), audienceId })
      : await resend.contacts.remove({ email: ref.email.trim().toLowerCase() });
    return unwrap(result, "Failed to delete contact");
  }
  throw new Error("id or email required");
}

export async function listResendContacts(options?: {
  limit?: number;
  after?: string;
  before?: string;
}) {
  const resend = getResend();
  const segmentId = process.env.RESEND_SEGMENT_ID?.trim();
  const audienceId = audienceIdFromEnv();

  const listOpts: {
    limit?: number;
    after?: string;
    before?: string;
    segmentId?: string;
    audienceId?: string;
  } = {
    limit: options?.limit ?? 50,
    after: options?.after,
    before: options?.before,
  };
  if (segmentId) listOpts.segmentId = segmentId;
  else if (audienceId) listOpts.audienceId = audienceId;

  const result = await resend.contacts.list(listOpts);
  const data = unwrap(result, "Failed to list contacts");
  return {
    contacts: (data.data ?? []) as ResendContactRecord[],
    hasMore: Boolean(data.has_more),
  };
}

/** Best-effort sync — never throws (newsletter flows). */
export async function syncContactToResend(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
  source?: string;
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!isResendContactsAvailable()) return { ok: false, skipped: true };
  const email = input.email.trim().toLowerCase();
  try {
    if (input.unsubscribed === true) {
      await updateResendContact({
        email,
        unsubscribed: true,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      return { ok: true };
    }
    await createResendContact({
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      unsubscribed: false,
      properties: input.source ? { source: input.source } : undefined,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    if (/already exists|duplicate/i.test(msg)) {
      try {
        await updateResendContact({
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          unsubscribed: input.unsubscribed,
        });
        return { ok: true };
      } catch (e2) {
        return { ok: false, error: e2 instanceof Error ? e2.message : msg };
      }
    }
    console.warn("[resend-contacts] sync skipped:", msg);
    return { ok: false, error: msg };
  }
}

export function splitName(fullName?: string | null): {
  firstName?: string;
  lastName?: string;
} {
  if (!fullName?.trim()) return {};
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
