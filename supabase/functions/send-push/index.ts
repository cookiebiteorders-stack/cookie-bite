import { timingSafeEqual } from "node:crypto";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@cookiebite.eg",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

/**
 * Internal-only guard. This function is invoked server-to-server (never from
 * the browser), so it must present the same shared secret used by
 * `app/api/push/send/route.ts`. Fails CLOSED — no secret configured means no
 * requests are accepted. Set with: `supabase secrets set PUSH_FUNCTION_SECRET=...`
 */
function verifyInternalSecret(req: Request): boolean {
  const expected = Deno.env.get("PUSH_FUNCTION_SECRET") ?? Deno.env.get("INTERNAL_API_SECRET");
  const received = req.headers.get("x-internal-secret");
  if (!expected || !received) return false;

  const a = new TextEncoder().encode(received);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type SendPushBody = {
  user_id?: unknown;
  notification?: {
    title?: unknown;
    body?: unknown;
    url?: unknown;
  };
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  if (!verifyInternalSecret(req)) {
    return jsonResponse({ error: "forbidden" }, 403);
  }

  let body: SendPushBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  const title =
    typeof body.notification?.title === "string" ? body.notification.title.slice(0, 120) : "";
  const messageBody =
    typeof body.notification?.body === "string" ? body.notification.body.slice(0, 500) : "";
  // Only allow same-site relative URLs — never an attacker-controlled absolute link.
  const rawUrl = typeof body.notification?.url === "string" ? body.notification.url : "/";
  const url = rawUrl.startsWith("/") && !rawUrl.startsWith("//") ? rawUrl.slice(0, 500) : "/";

  if (!userId || !title || !messageBody) {
    return jsonResponse({ error: "invalid_payload" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);

  const payload = JSON.stringify({
    title,
    body: messageBody,
    icon: "/brand/cookie-bite-icon.png",
    badge: "/brand/cookie-bite-icon.png",
    data: { url },
  });

  const results = await Promise.allSettled(
    (subs ?? []).map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload,
      ),
    ),
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return jsonResponse({ sent });
});
