import { AuthLayout } from "@/components/auth/auth-layout";
import { SupabaseSignUpForm } from "@/components/auth/supabase-sign-up-form";
import { getServerT } from "@/lib/i18n/server-translate";
import { safeAuthRedirectPath } from "@/lib/auth/safe-redirect";
import { IMAGES } from "@/lib/data";
import { getLangFromCookies } from "@/lib/seo/server";

type Props = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const afterAuth = safeAuthRedirectPath(redirect_url, "/account/complete-profile");
  const lang = await getLangFromCookies();
  const t = getServerT(lang);

  const signInHref =
    redirect_url && redirect_url !== "/account/complete-profile"
      ? `/sign-in?redirect_url=${encodeURIComponent(redirect_url)}`
      : "/sign-in";

  return (
    <AuthLayout
      badge={t("auth.badgeSignUp")}
      imageSrc={IMAGES.signUp}
      imageAlt={t("auth.imageAltSignUp")}
      imageClassName="object-cover object-[center_20%]"
      title={t("auth.signUpTitle")}
      subtitle={t("auth.signUpSub")}
      showAlternateAuth
      switchLabel={t("auth.switchSignInLabel")}
      switchHref={signInHref}
      switchCta={t("auth.switchSignInCta")}
      compactMobilePreview
      backHomeLabel={t("auth.backHome")}
      secureAuthLabel={t("auth.secureAuth")}
      asideTagline={lang === "ar" ? "كوكيز على دفعات صغيرة · التجمع الخامس" : undefined}
    >
      <SupabaseSignUpForm afterAuth={afterAuth} />
    </AuthLayout>
  );
}
