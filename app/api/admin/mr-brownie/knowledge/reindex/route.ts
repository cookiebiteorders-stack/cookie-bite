import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { syncKnowledgeChunks } from "@/lib/mr-brownie/brain/knowledge-index";
import { bilingualError } from "@/lib/validations";

export async function POST() {
  await requireAdminAccess("settings");

  const result = await syncKnowledgeChunks();
  if (!result.ok) {
    return NextResponse.json(
      bilingualError(result.error ?? "Reindex failed", "تعذر إعادة الفهرسة"),
      { status: 503 },
    );
  }

  return NextResponse.json({
    ok: true,
    indexed: result.indexed,
    products: result.products,
  });
}
