import { AuthLayout } from "@/components/auth/auth-layout";
import { ClerkSmartCaptcha } from "@/components/auth/clerk-smart-captcha";
import { SignInForm } from "@/components/auth/sign-in-form";
import {
  AUTH_SWITCH_SIGN_UP_CTA,
  AUTH_SWITCH_SIGN_UP_LABEL,
  SIGN_IN_SUBTITLE,
  SIGN_IN_TITLE,
} from "@/lib/auth/clerk-auth-localization";
import { safeAuthRedirectPath } from "@/lib/auth/safe-redirect";
import { IMAGES } from "@/lib/data";

type Props = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const afterAuth = safeAuthRedirectPath(redirect_url, "/account");

  const signUpHref =
    redirect_url && redirect_url !== "/account"
      ? `/sign-up?redirect_url=${encodeURIComponent(redirect_url)}`
      : "/sign-up";

  return (
    <AuthLayout
      badge="Sign in"
      title={SIGN_IN_TITLE}
      subtitle={SIGN_IN_SUBTITLE}
      imageSrc={IMAGES.signIn}
      imageAlt="Cookie Bite — welcome back"
      imageClassName="object-cover object-[center_20%]"
      showAlternateAuth
      switchLabel={AUTH_SWITCH_SIGN_UP_LABEL}
      switchHref={signUpHref}
      switchCta={AUTH_SWITCH_SIGN_UP_CTA}
      compactMobilePreview
    >
      <ClerkSmartCaptcha />
      <SignInForm afterAuth={afterAuth} />
    </AuthLayout>
  );
}
