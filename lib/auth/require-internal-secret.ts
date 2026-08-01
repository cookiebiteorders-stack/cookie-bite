import { NextResponse } from "next/server";

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

if (!INTERNAL_API_SECRET || INTERNAL_API_SECRET.trim() === "" || INTERNAL_API_SECRET.includes("REPLACE_ME")) {
  throw new Error(
    "INTERNAL_API_SECRET is not set or is invalid. Set it in your environment variables before starting the server."
  );
}

/**
 * Validates that the request contains the correct INTERNAL_API_SECRET.
 * Used to protect cron jobs and internal API endpoints.
 * 
 * @param request - The incoming request object
 * @returns NextResponse with 401 if invalid, null if valid
 */
export function requireInternalSecret(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "")?.trim();
  
  if (!providedSecret || providedSecret !== INTERNAL_API_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing internal API secret" },
      { status: 401 }
    );
  }
  
  return null;
}

/**
 * Validates INTERNAL_API_SECRET from query parameter instead of header.
 * Useful for cron jobs that use query params.
 * 
 * @param searchParams - URLSearchParams from the request
 * @returns NextResponse with 401 if invalid, null if valid
 */
export function requireInternalSecretFromQuery(searchParams: URLSearchParams): NextResponse | null {
  const providedSecret = searchParams.get("secret")?.trim();
  
  if (!providedSecret || providedSecret !== INTERNAL_API_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing internal API secret" },
      { status: 401 }
    );
  }
  
  return null;
}
