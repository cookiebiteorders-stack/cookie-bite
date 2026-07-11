import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/auth/server-helpers";
import { safeAuthRedirectPath, getBaseUrl } from "@/lib/auth/safe-redirect";
import { getAuthError, AuthErrorCode } from "@/lib/auth/errors";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? requestUrl.searchParams.get("redirect_url") ?? "/account";

  const baseUrl = getBaseUrl();

  // Handle OAuth errors
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);
    
    // Map OAuth errors to our error codes
    let errorCode = AuthErrorCode.OAUTH_FAILED;
    if (error === "access_denied" || error === "user_cancelled") {
      errorCode = AuthErrorCode.OAUTH_CANCELLED;
    }
    
    const authError = getAuthError(errorCode);
    const errMessage = errorDescription || authError.message;
    return NextResponse.redirect(`${baseUrl}/sign-in?error=${encodeURIComponent(errMessage)}`);
  }

  if (code) {
    try {
      const supabase = await getServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error("Error exchanging code for session:", err);
      const authError = getAuthError(AuthErrorCode.OAUTH_FAILED);
      return NextResponse.redirect(`${baseUrl}/sign-in?error=${encodeURIComponent(authError.message)}`);
    }
  }

  // URL to redirect to after sign in process completes
  const safePath = safeAuthRedirectPath(next, "/account");
  return NextResponse.redirect(`${baseUrl}${safePath}`);
}
