import { AuthLayout } from "@/components/auth/auth-layout";
import { SupabaseForgotPasswordForm } from "@/components/auth/supabase-forgot-password-form";
import { getServerT } from "@/lib/i18n/server-translate";
import { IMAGES } from "@/lib/data";
import { getLangFromCookies } from "@/lib/seo/server";
import Link from "next/link";

export default async function ForgotPasswordPage() {
  const lang = await getLangFromCookies();
  const t = getServerT(lang);

  return (
    <AuthLayout
      badge="Forgot Password"
      imageSrc={IMAGES.signIn}
      imageAlt="Password reset"
      imageClassName="object-cover object-[center_20%]"
      title="Reset Password"
      subtitle="We'll send you a link to reset your password"
      showAlternateAuth={false}
      compactMobilePreview
      backHomeLabel={t("auth.backHome")}
      secureAuthLabel={t("auth.secureAuth")}
      asideTagline={lang === "ar" ? "كوكيز على دفعات صغيرة · التجمع الخامس" : undefined}
    >
      <SupabaseForgotPasswordForm />
      <div className="mt-4 text-center">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-cb-brand-600 hover:text-cb-brand-700 dark:text-cb-brand-400 dark:hover:text-cb-brand-300"
        >
          Back to Sign In
        </Link>
      </div>
    </AuthLayout>
  );
}
