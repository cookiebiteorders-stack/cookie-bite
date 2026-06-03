import { NextRequest, NextResponse } from "next/server";
import { listOccasionTemplates } from "@/lib/occasion-templates/list";

export async function GET(req: NextRequest) {
  const featured = req.nextUrl.searchParams.get("featured") === "1";
  const templates = await listOccasionTemplates(featured);
  return NextResponse.json({ templates });
}
