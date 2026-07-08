import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);
    return NextResponse.redirect(`${requestUrl.origin}/sign-in?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error("Error exchanging code for session:", err);
      return NextResponse.redirect(`${requestUrl.origin}/sign-in?error=${encodeURIComponent("Failed to complete sign in")}`);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}/account`);
}
