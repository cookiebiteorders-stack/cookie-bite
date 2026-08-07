import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { roleMatrix } from "@/lib/admin/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const assignRoleSchema = z.object({
  user_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  role: z.enum(["owner", "admin", "staff", "customer"]),
});

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "staff", "customer"]),
});

export async function GET() {
  await requireAdminAccess("roles");
  const supabase = createSupabaseAdminClient();

  const { data: assignments } = await supabase
    .from("users")
    .select("id, email, role, full_name, avatar_url")
    .in("role", ["owner", "admin", "staff"])
    .order("updated_at", { ascending: false })
    .limit(100);

  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, role, avatar_url")
    .order("created_at", { ascending: false })
    .limit(500);

  return NextResponse.json({
    role_matrix: roleMatrix,
    assignments: assignments ?? [],
    users: users ?? [],
  });
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

  const userId = parsed.data.user_id?.trim();
  const email = parsed.data.email?.trim().toLowerCase();
  const nextRole = parsed.data.role;
  const supabase = createSupabaseAdminClient();
  if (!userId && !email) {
    return NextResponse.json(
      bilingualError("User is required", "المستخدم مطلوب"),
      { status: 400 },
    );
  }

  let lookup = supabase.from("users").select("id, email, role").limit(1);
  if (userId) lookup = lookup.eq("id", userId);
  else lookup = lookup.ilike("email", email!);
  const { data: existing, error: lookupError } = await lookup.maybeSingle();

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
  // Under Supabase Auth, users.id IS auth.users.id — no Clerk link exists or is required.

  if (existing.role === nextRole) {
    return NextResponse.json(
      bilingualError("Role already assigned", "تم تعيين هذا الدور بالفعل"),
      { status: 409 },
    );
  }

  // Use invariant-enforcing RPC to prevent last-owner demotion
  const { data: result, error: rpcError } = await supabase.rpc("change_user_role", {
    p_target_user_id: existing.id,
    p_new_role: nextRole,
    p_reason: `Role assigned by ${actor.email}`,
  });

  if (rpcError || !result?.[0]?.success) {
    const errorMessage = result?.[0]?.error_message || rpcError?.message || "Failed to assign role";
    return NextResponse.json(
      bilingualError(errorMessage, errorMessage),
      { status: 400 },
    );
  }

  const { data: updated } = await supabase
    .from("users")
    .select("id, email, role, full_name")
    .eq("id", existing.id)
    .single();

  return NextResponse.json({ ok: true, assignment: updated });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("roles");
  if (actor.role !== "owner") {
    return NextResponse.json(
      bilingualError("Only owner can update roles", "فقط المالك يمكنه تعديل الأدوار"),
      { status: 403 },
    );
  }
  const parsed = updateRoleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", parsed.data.user_id)
    .maybeSingle();
  if (findError) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json(
      bilingualError("User not found", "المستخدم غير موجود"),
      { status: 404 },
    );
  }
  // Under Supabase Auth, users.id IS auth.users.id — no Clerk link exists or is required.

  if (existing.role === parsed.data.role) {
    return NextResponse.json(
      bilingualError("Role already assigned", "تم تعيين هذا الدور بالفعل"),
      { status: 409 },
    );
  }
  // Use invariant-enforcing RPC to prevent last-owner demotion
  const { data: result, error: rpcError } = await supabase.rpc("change_user_role", {
    p_target_user_id: existing.id,
    p_new_role: parsed.data.role,
    p_reason: `Role updated by ${actor.email}`,
  });

  if (rpcError || !result?.[0]?.success) {
    const errorMessage = result?.[0]?.error_message || rpcError?.message || "Failed to update role";
    return NextResponse.json(
      bilingualError(errorMessage, errorMessage),
      { status: 400 },
    );
  }

  const { data: updated } = await supabase
    .from("users")
    .select("id, email, role, full_name, avatar_url")
    .eq("id", existing.id)
    .single();

  return NextResponse.json({ ok: true, assignment: updated });
}

export async function DELETE(req: NextRequest) {
  const actor = await requireAdminAccess("roles");
  if (actor.role !== "owner") {
    return NextResponse.json(
      bilingualError("Only owner can remove roles", "فقط المالك يمكنه إزالة الأدوار"),
      { status: 403 },
    );
  }
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id")?.trim();
  if (!userId) {
    return NextResponse.json(
      bilingualError("user_id is required", "حقل user_id مطلوب"),
      { status: 400 },
    );
  }
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: findError } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();
  if (findError) {
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json(
      bilingualError("User not found", "المستخدم غير موجود"),
      { status: 404 },
    );
  }
  if (existing.role === "customer") {
    return NextResponse.json(
      bilingualError("Role already removed", "الدور مرفوع بالفعل"),
      { status: 409 },
    );
  }
  // Use invariant-enforcing RPC to prevent last-owner demotion
  const { data: result, error: rpcError } = await supabase.rpc("change_user_role", {
    p_target_user_id: userId,
    p_new_role: "customer",
    p_reason: `Role removed by ${actor.email}`,
  });

  if (rpcError || !result?.[0]?.success) {
    const errorMessage = result?.[0]?.error_message || rpcError?.message || "Failed to remove role";
    return NextResponse.json(
      bilingualError(errorMessage, errorMessage),
      { status: 400 },
    );
  }

  const { data: updated } = await supabase
    .from("users")
    .select("id, email, role, full_name, avatar_url")
    .eq("id", userId)
    .single();

  return NextResponse.json({ ok: true, assignment: updated });
}

