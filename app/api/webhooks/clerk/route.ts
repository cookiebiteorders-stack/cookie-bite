import { Webhook } from "svix";
import { provisionClerkUsername } from "@/lib/auth/clerk-provision-credentials";
import {
  clerkWebhookSecretLooksValid,
  clerkWebhookSecretMisconfigurationHint,
  resolveClerkWebhookSigningSecret,
} from "@/lib/auth/clerk-webhook-secret";
import { isEmailBlocked } from "@/lib/db/blocked-emails";
import { deleteUserByClerkId, upsertUserFromClerk } from "@/lib/db/users";
import { clerkClient } from "@clerk/nextjs/server";
import { trySendWelcomeEmailOnce } from "@/lib/email/welcome-onboarding";
import { tryNotifyStaffNewCustomer } from "@/lib/notifications/new-customer-staff-alert";

type ClerkUserEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    username?: string | null;
    email_addresses?: Array<{ id: string; email_address: string }>;
    primary_email_address_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    deleted?: boolean;
  };
};

function pickPrimaryEmail(data: ClerkUserEvent["data"]): string | null {
  if (!data.email_addresses?.length) return null;
  const primaryId = data.primary_email_address_id ?? data.email_addresses[0]?.id;
  return (
    data.email_addresses.find((e) => e.id === primaryId)?.email_address ??
    data.email_addresses[0]?.email_address ??
    null
  );
}

export async function POST(req: Request) {
  const secret = resolveClerkWebhookSigningSecret();
  if (!secret) {
    return new Response("Missing CLERK_WEBHOOK_SIGNING_SECRET", { status: 500 });
  }

  const misconfig = clerkWebhookSecretMisconfigurationHint(secret);
  if (misconfig) {
    console.error("Clerk webhook secret misconfigured:", misconfig);
    return new Response(misconfig, { status: 500 });
  }

  const svix_id = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const body = await req.text();
  let evt: ClerkUserEvent;
  try {
    evt = new Webhook(secret).verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent;
  } catch (err) {
    console.error("Clerk webhook verification failed", err);
    const hint = clerkWebhookSecretLooksValid(secret)
      ? "Invalid signature — paste the Signing Secret from this exact webhook endpoint in Clerk (whsec_…), then Redeploy Hostinger. Each endpoint has its own secret."
      : clerkWebhookSecretMisconfigurationHint(secret) ??
        "Invalid signing secret format.";
    return new Response(hint, { status: 400 });
  }

  if (evt.type === "user.deleted") {
    if (evt.data.id) await deleteUserByClerkId(evt.data.id);
    return Response.json({ ok: true });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const email = pickPrimaryEmail(evt.data);
    if (!email) return Response.json({ ok: false, reason: "no email" });

    if (await isEmailBlocked(email)) {
      if (evt.type === "user.created" && evt.data.id) {
        try {
          const client = await clerkClient();
          await client.users.deleteUser(evt.data.id);
        } catch (err) {
          console.error("clerk webhook: failed to remove blocked signup", err);
        }
      }
      return Response.json({ ok: false, reason: "email_blocked" });
    }

    const fullName = [evt.data.first_name, evt.data.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || null;

    const dbUser = await upsertUserFromClerk({
      clerkUserId: evt.data.id,
      email,
      fullName,
      avatarUrl: evt.data.image_url ?? null,
    });

    try {
      await provisionClerkUsername(evt.data.id);
    } catch (err) {
      console.error("clerk provision username failed", err);
    }

    if (evt.type === "user.created" && dbUser) {
      try {
        const result = await trySendWelcomeEmailOnce({
          userId: dbUser.id,
          to: email,
          name: evt.data.first_name ?? undefined,
          force: true,
        });
        if (!result.sent && result.reason !== "already_sent") {
          console.warn("welcome email skipped", result.reason);
        }
      } catch (err) {
        console.error("welcome email failed", err);
      }

      try {
        const staffResult = await tryNotifyStaffNewCustomer({
          kind: "signup",
          user: dbUser,
          clerkUsername: evt.data.username ?? null,
        });
        if (staffResult.sent === 0 && staffResult.reason !== "already_sent") {
          console.warn("staff signup alert skipped", staffResult.reason);
        }
      } catch (err) {
        console.error("staff signup alert failed", err);
      }
    }
  }

  return Response.json({ ok: true });
}
