import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VOTER_COOKIE = "cb_review_voter";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: reviewId } = await ctx.params;
  if (!reviewId) {
    return NextResponse.json({ error: "Missing review id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in visitors are bound to their stable user id (can't reset by
  // clearing cookies). Anonymous visitors fall back to a persistent cookie.
  const jar = await cookies();
  let voterKey = user ? `user:${user.id}` : jar.get(VOTER_COOKIE)?.value;
  const setCookie = !user && !voterKey;
  if (!voterKey) {
    voterKey = crypto.randomUUID();
  }

  const { data, error } = await supabase.rpc("register_review_helpful_vote", {
    p_review_id: reviewId,
    p_voter_key: voterKey,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("review not found")) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    console.error("review helpful vote", error);
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  const helpful_count =
    row && typeof row === "object" && "helpful_count" in row
      ? Number((row as { helpful_count: number }).helpful_count)
      : 0;
  const already_voted =
    row && typeof row === "object" && "already_voted" in row
      ? Boolean((row as { already_voted: boolean }).already_voted)
      : false;

  const res = NextResponse.json({ helpful_count, already_voted });
  if (setCookie) {
    res.cookies.set(VOTER_COOKIE, voterKey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return res;
}
