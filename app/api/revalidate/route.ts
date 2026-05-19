import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

/**
 * تحقق آمن من السر — يقارن بطول ثابت لمنع تسريب التوقيت.
 */
function isValidSecret(received: string | null | undefined): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST مُفضّل: السر في Header `x-revalidate-secret`.
 * يقبل GET فقط للتوافق مع الإعدادات القديمة، لكن يُحذّر في السجل ولا يقبل
 * السر إلا من Header (لا من query string لتجنّب تسريبه في logs/Referer).
 */
async function handle(req: NextRequest, tag: string | null) {
  const headerSecret = req.headers.get("x-revalidate-secret");
  if (!isValidSecret(headerSecret)) {
    return NextResponse.json(
      { error: { en: "Invalid secret", ar: "سر غير صالح" } },
      { status: 401 },
    );
  }
  if (!tag) {
    return NextResponse.json(
      { error: { en: "Missing tag", ar: "الوسم مفقود" } },
      { status: 400 },
    );
  }
  revalidateTag(tag, "max");
  return NextResponse.json({ revalidated: true, tag });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { tag?: string } | null;
  const tag = body?.tag?.trim() || req.nextUrl.searchParams.get("tag");
  return handle(req, tag);
}

export async function GET(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams.get("tag"));
}

export const dynamic = "force-dynamic";
