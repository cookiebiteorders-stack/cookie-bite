import { getCsrfToken } from "@/lib/security/csrf";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = await getCsrfToken();
    
    const response = NextResponse.json({
      token,
      headerName: "x-csrf-token",
    });
    
    // Set the cookie explicitly in the response
    response.cookies.set("csrf_token", token, {
      httpOnly: false, // Allow JS access in dev for debugging
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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
