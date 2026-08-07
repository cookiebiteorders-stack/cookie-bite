import { getCsrfTokenForClient } from "@/lib/security/csrf";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const csrfData = await getCsrfTokenForClient();
    return NextResponse.json(csrfData);
  } catch (error) {
    console.error("Failed to generate CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
