import { auth } from "@/lib/auth/supabase-auth";
import { NextResponse } from "next/server";
import { resolveServerBehaviors } from "@/lib/announcements/behavior-server";
import { resolvePageFromPath } from "@/lib/announcements/shared";
import { getAnnouncementsForUser } from "@/lib/announcements/server";
import type { AnnouncementUserContext, AudienceUserType } from "@/lib/announcements/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveStaffRole } from "@/lib/admin/auth-role";

export const dynamic = "force-dynamic";

async function resolveUserContext(
  page: string,
  clientBehaviors: string[],
): Promise<AnnouncementUserContext> {
  const resolvedPage = resolvePageFromPath(page);
  const { userId } = await auth();

  if (!userId) {
    return {
      isSignedIn: false,
      userType: "guest",
      page: resolvedPage,
      behaviors: await resolveServerBehaviors(null, clientBehaviors),
    };
  }

  let userType: AudienceUserType = "logged_in";
  let userName: string | null = null;
  let loyaltyTier: string | null = null;
  let dbUserId: string | null = null;

  try {
    const { user } = await auth();
    userName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? null;

    const role = await resolveStaffRole({
      email: user?.email ?? null,
      supabaseUserId: userId,
    });
    if (["owner", "admin", "staff"].includes(role)) {
      userType = "staff";
    }

    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, loyalty_tier")
      .eq("id", userId)
      .maybeSingle();

    dbUserId = (data?.id as string | undefined) ?? null;
    loyaltyTier = (data?.loyalty_tier as string | undefined) ?? null;
    if (loyaltyTier === "gold" || loyaltyTier === "platinum") {
      userType = "premium";
    }
  } catch {
    /* keep defaults */
  }

  const behaviors = await resolveServerBehaviors(dbUserId, [
    ...clientBehaviors,
    "logged_in",
  ]);

  return {
    isSignedIn: true,
    userType,
    userName,
    loyaltyTier,
    page: resolvedPage,
    behaviors,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ?? "/";
  const lang = searchParams.get("lang") === "ar" ? "ar" : "en";
  const type = searchParams.get("type");

  const behaviorsParam = searchParams.get("behaviors") ?? "";
  const clientBehaviors = behaviorsParam
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  const sessionId = searchParams.get("sessionId") ?? "anon";

  const ctx = await resolveUserContext(page, clientBehaviors);
  let announcements = await getAnnouncementsForUser(ctx, lang, sessionId);

  if (type) {
    announcements = announcements.filter((a) => a.type === type);
  }

  return NextResponse.json(
    { announcements, context: { page: ctx.page, userType: ctx.userType } },
    {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    },
  );
}
