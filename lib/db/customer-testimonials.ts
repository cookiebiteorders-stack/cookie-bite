import "server-only";

import type { Lang } from "@/lib/i18n/translations";
import type { PublicCustomerTestimonial } from "@/lib/testimonials/public-types";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";

export type { PublicCustomerTestimonial };

const AVATAR_COLORS = [
  "bg-cb-peach-deep",
  "bg-cb-mint/40",
  "bg-cb-peach",
  "bg-cb-pink/50",
] as const;

function resolveAuthorName(
  user: {
    full_name?: string | null;
    full_name_ar?: string | null;
    full_name_en?: string | null;
  } | null,
  lang: Lang,
): string {
  if (!user) return lang === "ar" ? "عميل" : "Customer";
  if (lang === "ar") {
    return (
      user.full_name_ar?.trim() ||
      user.full_name?.trim() ||
      user.full_name_en?.trim() ||
      "عميل"
    );
  }
  return (
    user.full_name_en?.trim() ||
    user.full_name?.trim() ||
    user.full_name_ar?.trim() ||
    "Customer"
  );
}

function initialFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

/** آراء العملاء المعتمدة للعرض العام (الصفحة الرئيسية وغيرها). */
export async function listApprovedCustomerTestimonials(
  lang: Lang,
  limit = 24,
): Promise<PublicCustomerTestimonial[]> {
  const supabase = tryCreateSupabaseAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("customer_testimonials")
    .select(
      "id, rating, comment, created_at, user:users(full_name, full_name_ar, full_name_en)",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if ((error as { code?: string }).code === "42P01") return [];
    console.error("[customer-testimonials] listApproved", error);
    return [];
  }

  const customerLabel = lang === "ar" ? "عميل كوكي بايت" : "Cookie Bite customer";

  return (data ?? []).map((row, index) => {
    const user = row.user as {
      full_name?: string | null;
      full_name_ar?: string | null;
      full_name_en?: string | null;
    } | null;
    const authorName = resolveAuthorName(user, lang);
    return {
      id: String(row.id),
      rating: Math.min(5, Math.max(1, Number(row.rating) || 5)),
      comment: String(row.comment ?? "").trim(),
      createdAt: String(row.created_at ?? ""),
      authorName,
      authorInitial: initialFromName(authorName),
      authorMeta: customerLabel,
      avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    };
  });
}
