import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { resolveStaffRole } from "@/lib/admin/auth-role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=%2Fadmin");
  }

  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.primaryEmailAddress?.emailAddress ?? null;
  } catch (e) {
    console.error("AdminLayout currentUser failed:", e);
  }

  const role = await resolveStaffRole({ email, clerkUserId: userId });

  /** لوحة الإدارة لـ owner / admin / staff فقط — الدور يُقرأ من جدول users (أو قوائم البريد الاحتياطية). */
  if (!["owner", "admin", "staff"].includes(role)) {
    redirect("/403");
  }

  /** قشرة الإدارة منفصلة عن متجر PageShell (لا هيدر/فوتر/سلة/شات المتجر). */
  return <AdminShell role={role}>{children}</AdminShell>;
}
