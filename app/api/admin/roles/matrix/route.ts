import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { roleMatrix } from "@/lib/admin/rbac";

export async function GET() {
  await requireAdminAccess("roles");
  return NextResponse.json({ role_matrix: roleMatrix });
}

