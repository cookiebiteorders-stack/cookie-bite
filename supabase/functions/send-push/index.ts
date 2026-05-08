import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push";

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:hello@cookiebite.eg",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  const body = (await req.json()) as {
    user_id: string;
    notification: { title: string; body: string; url?: string };
  };
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", body.user_id);

  const payload = JSON.stringify({
    title: body.notification.title,
    body: body.notification.body,
    icon: "/brand/cookie-bite-icon.png",
    badge: "/brand/cookie-bite-icon.png",
    data: { url: body.notification.url ?? "/" },
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
  return new Response(JSON.stringify({ sent }), {
    headers: { "Content-Type": "application/json" },
  });
});
