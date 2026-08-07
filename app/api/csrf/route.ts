import { getCsrfToken } from "@/lib/security/csrf";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // getCsrfToken() already sets the cookie with the correct attributes
    // We just need to return the token value to the client
    const token = await getCsrfToken();
    
    return NextResponse.json({
      token,
      headerName: "x-csrf-token",
    });
  } catch (error) {
    console.error("Failed to generate CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
