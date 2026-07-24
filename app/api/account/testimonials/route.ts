import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { bilingualError } from "@/lib/validations";

const payloadSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(600),
});

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_testimonials")
    .select("id, rating, comment, status, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json(
      bilingualError("Database error", "خطأ في قاعدة البيانات"),
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), {
      status: 401,
    });
  }

  const parsed = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("customer_testimonials")
    .insert({
      user_id: profile.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      // Never auto-publish user-submitted text under the customer's real name
      // — requires admin approval via /api/admin/testimonials first.
      status: "pending",
    })
    .select("id, rating, comment, status, created_at")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return NextResponse.json(
        bilingualError(
          "Testimonials table is missing. Run latest migrations.",
          "جدول الآراء غير موجود. شغّل آخر migrations.",
        ),
        { status: 503 },
      );
    }
    return NextResponse.json(
      bilingualError("Failed to save testimonial", "فشل حفظ الرأي"),
      { status: 500 },
    );
  }

  revalidatePath("/");
  return NextResponse.json({ ok: true, item: data });
}
