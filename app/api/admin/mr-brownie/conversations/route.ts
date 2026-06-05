import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  conversationsToCsv,
  fetchMrBrownieConversations,
} from "@/lib/mr-brownie/admin/conversations";
import { bilingualError } from "@/lib/validations";

export async function GET(req: NextRequest) {
  await requireAdminAccess("analytics");

  const sp = req.nextUrl.searchParams;
  const days = Number(sp.get("days") ?? 30);
  const intent = sp.get("intent") ?? undefined;
  const persona = sp.get("persona") ?? undefined;
  const limit = Number(sp.get("limit") ?? 40);
  const offset = Number(sp.get("offset") ?? 0);
  const format = sp.get("format");

  const { rows, total } = await fetchMrBrownieConversations({
    days: Number.isFinite(days) ? days : 30,
    intent,
    persona,
    limit: Number.isFinite(limit) ? limit : 40,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  if (format === "csv") {
    const csv = conversationsToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mr-brownie-conversations.csv"`,
      },
    });
  }

  return NextResponse.json({ rows, total, period_days: days });
}
