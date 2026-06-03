import { NextResponse } from "next/server";
import { listActiveMysteryRules } from "@/lib/mystery-box/rules";

/** Public list of active mystery box rules (occasion + budget bands). */
export async function GET() {
  const rules = await listActiveMysteryRules();
  const occasions = [...new Set(rules.map((r) => r.occasion))];
  return NextResponse.json({ rules, occasions });
}
