import { getCsrfToken } from "@/lib/security/csrf";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = await getCsrfToken();
    
    const response = NextResponse.json({
      token,
      headerName: "x-csrf-token",
    });
    
    // Set the cookie with the same attributes as the server-side function
    // This ensures consistency between the cookie set by getCsrfToken() and this endpoint
    response.cookies.set("csrf_token", token, {
      httpOnly: process.env.NODE_ENV === 'production',
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    
    return response;
  } catch (error) {
    console.error("Failed to generate CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
