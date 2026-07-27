import "@/app/styles/route-admin.css";
import { auth } from "@/lib/auth/supabase-auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { resolveStaffRole } from "@/lib/admin/auth-role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, user } = await auth();
  if (!userId || !user) {
    redirect("/sign-in?redirect_url=%2Fadmin");
  }

  const email = user.email ?? null;
  const role = await resolveStaffRole({ email, supabaseUserId: userId });

  /** لوحة الإدارة لـ owner / admin / staff فقط — الدور يُقرأ من جدول users (أو قوائم البريد الاحتياطية). */
  if (!["owner", "admin", "staff"].includes(role)) {
    redirect("/403");
  }

  /** قشرة الإدارة تحتفظ بشريط المتجر (الهيدر الجوال + سطح المكتب) والسلة، مع التنقل الداخلي للوحة. */
  return <AdminShell role={role}>{children}</AdminShell>;
}
