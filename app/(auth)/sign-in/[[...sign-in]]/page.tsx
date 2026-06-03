import { AuthLayout } from "@/components/auth/auth-layout";
import { ClerkSmartCaptcha } from "@/components/auth/clerk-smart-captcha";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getServerT } from "@/lib/i18n/server-translate";
import { safeAuthRedirectPath } from "@/lib/auth/safe-redirect";
import { IMAGES } from "@/lib/data";
import { getLangFromCookies } from "@/lib/seo/server";

type Props = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const afterAuth = safeAuthRedirectPath(redirect_url, "/account");
  const lang = await getLangFromCookies();
  const t = getServerT(lang);

  const signUpHref =
    redirect_url && redirect_url !== "/account"
      ? `/sign-up?redirect_url=${encodeURIComponent(redirect_url)}`
      : "/sign-up";

  return (
    <AuthLayout
      badge={t("auth.badgeSignIn")}
      title={t("auth.signInTitle")}
      subtitle={t("auth.signInSub")}
      imageSrc={IMAGES.signIn}
      imageAlt={t("auth.imageAltSignIn")}
      imageClassName="object-cover object-[center_20%]"
      showAlternateAuth
      switchLabel={t("auth.switchSignUpLabel")}
      switchHref={signUpHref}
      switchCta={t("auth.switchSignUpCta")}
      compactMobilePreview
      backHomeLabel={t("auth.backHome")}
      secureAuthLabel={t("auth.secureAuth")}
      asideTagline={lang === "ar" ? "كوكيز على دفعات صغيرة · التجمع الخامس" : undefined}
    >
      <ClerkSmartCaptcha />
      <SignInForm afterAuth={afterAuth} />
    </AuthLayout>
  );
}
