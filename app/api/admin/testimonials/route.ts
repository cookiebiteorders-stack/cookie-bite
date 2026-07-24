import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const statusFilterSchema = z.enum(["pending", "approved", "rejected", "all"]).default("pending");

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected", "pending"]),
});

/** Customer testimonials moderation queue — never auto-published (see app/api/account/testimonials). */
export async function GET(req: NextRequest) {
  let actor;
  try {
    actor = await requireAdminAccess("customers");
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }
  void actor;

  const statusParam = statusFilterSchema.safeParse(
    req.nextUrl.searchParams.get("status") ?? undefined,
  );
  const status = statusParam.success ? statusParam.data : "pending";

  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("customer_testimonials")
    .select("id, rating, comment, status, created_at, user:users(full_name, full_name_ar, full_name_en, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json(bilingualError("Database error", "خطأ في قاعدة البيانات"), {
      status: 500,
    });
  }

  return NextResponse.json({ items: data ?? [] });
}

/** Approve/reject a customer testimonial before it can appear publicly. */
export async function PATCH(req: NextRequest) {
  let actor;
  try {
    actor = await requireAdminAccess("customers");
    requireWritePermission(actor);
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_testimonials")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .select("id, rating, comment, status, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(bilingualError("Failed to update testimonial", "فشل تحديث الرأي"), {
      status: 500,
    });
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true, item: data });
}
