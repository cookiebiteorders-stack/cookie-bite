import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { roleMatrix } from "@/lib/admin/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const assignRoleSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "staff", "customer"]),
});

export async function GET() {
  await requireAdminAccess("roles");
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("users")
    .select("id, email, role, full_name")
    .in("role", ["owner", "admin", "staff"])
    .order("updated_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ role_matrix: roleMatrix, assignments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("roles");
  if (actor.role !== "owner") {
    return NextResponse.json(
      bilingualError("Only owner can assign roles", "فقط المالك يمكنه تعيين الأدوار"),
      { status: 403 },
    );
  }

  const parsed = assignRoleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const nextRole = parsed.data.role;
  const supabase = createSupabaseAdminClient();

  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id, email, role")
    .ilike("email", email)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json(
      bilingualError(
        "User not found. Ask this email to sign up first.",
        "المستخدم غير موجود. اطلب من هذا البريد التسجيل أولاً.",
      ),
      { status: 404 },
    );
  }

  const { data: updated, error } = await supabase
    .from("users")
    .update({ role: nextRole })
    .eq("id", existing.id)
    .select("id, email, role, full_name")
    .single();

  if (error) {
    return NextResponse.json(
      bilingualError("Failed to assign role", "فشل تعيين الدور"),
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, assignment: updated });
}

