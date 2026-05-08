import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const tag = req.nextUrl.searchParams.get("tag");
  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
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
