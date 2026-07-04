import { AuthLayout } from "@/components/auth/auth-layout";
import { SupabaseResetPasswordForm } from "@/components/auth/supabase-reset-password-form";
import { getServerT } from "@/lib/i18n/server-translate";
import { IMAGES } from "@/lib/data";
import { getLangFromCookies } from "@/lib/seo/server";

export default async function ResetPasswordPage() {
  const lang = await getLangFromCookies();
  const t = getServerT(lang);

  return (
    <AuthLayout
      badge="Reset Password"
      imageSrc={IMAGES.signIn}
      imageAlt="Password reset"
      imageClassName="object-cover object-[center_20%]"
      title="Set New Password"
      subtitle="Enter your new password below"
      showAlternateAuth={false}
      compactMobilePreview
      backHomeLabel={t("auth.backHome")}
      secureAuthLabel={t("auth.secureAuth")}
      asideTagline={lang === "ar" ? "كوكيز على دفعات صغيرة · التجمع الخامس" : undefined}
    >
      <SupabaseResetPasswordForm />
    </AuthLayout>
  );
}
