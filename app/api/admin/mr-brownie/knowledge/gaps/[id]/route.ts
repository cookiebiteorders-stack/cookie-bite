import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { deleteKnowledgeGap } from "@/lib/mr-brownie/brain/knowledge-gaps";
import { bilingualError } from "@/lib/validations";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, context: RouteContext) {
  await requireAdminAccess("analytics");

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json(bilingualError("Missing id", "معرّف غير صالح"), { status: 400 });
  }

  const result = await deleteKnowledgeGap(id.trim());
  if (!result.ok) {
    const status = result.error === "Not found" ? 404 : 503;
    return NextResponse.json(
      bilingualError(result.error ?? "Delete failed", "تعذر حذف فجوة المعرفة"),
      { status },
    );
  }

  return NextResponse.json({ ok: true });
}
