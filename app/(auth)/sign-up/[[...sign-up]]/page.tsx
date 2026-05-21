import { AuthLayout } from "@/components/auth/auth-layout";
import { ClerkSmartCaptcha } from "@/components/auth/clerk-smart-captcha";
import { SignUpForm } from "@/components/auth/sign-up-form";
import {
  AUTH_SWITCH_SIGN_IN_CTA,
  AUTH_SWITCH_SIGN_IN_LABEL,
  SIGN_UP_SUBTITLE,
  SIGN_UP_TITLE,
} from "@/lib/auth/clerk-auth-localization";
import { safeAuthRedirectPath } from "@/lib/auth/safe-redirect";
import { IMAGES } from "@/lib/data";

type Props = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const afterAuth = safeAuthRedirectPath(redirect_url, "/account/complete-profile");

  const signInHref =
    redirect_url && redirect_url !== "/account/complete-profile"
      ? `/sign-in?redirect_url=${encodeURIComponent(redirect_url)}`
      : "/sign-in";

  return (
    <AuthLayout
      badge="New account"
      imageSrc={IMAGES.signUp}
      imageAlt="Cookie Bite — join the bakery family"
      imageClassName="object-cover object-[center_20%]"
      title={SIGN_UP_TITLE}
      subtitle={SIGN_UP_SUBTITLE}
      showAlternateAuth
      switchLabel={AUTH_SWITCH_SIGN_IN_LABEL}
      switchHref={signInHref}
      switchCta={AUTH_SWITCH_SIGN_IN_CTA}
      compactMobilePreview
    >
      <ClerkSmartCaptcha />
      <SignUpForm afterAuth={afterAuth} />
    </AuthLayout>
  );
}
