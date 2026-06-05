import { NextResponse } from "next/server";
import { listActiveMysteryRules } from "@/lib/mystery-box/rules";

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
} as const;

/** Public list of active mystery box rules (occasion + budget bands). */
export async function GET() {
  const rules = await listActiveMysteryRules();
  const occasions = [...new Set(rules.map((r) => r.occasion))];
  return NextResponse.json({ rules, occasions }, { headers: CACHE_HEADERS });
}
