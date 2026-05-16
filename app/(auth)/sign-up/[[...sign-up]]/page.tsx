import { AuthLayout } from "@/components/auth/auth-layout";
import { ClerkSmartCaptcha } from "@/components/auth/clerk-smart-captcha";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { safeAuthRedirectPath } from "@/lib/auth/safe-redirect";
import { IMAGES } from "@/lib/data";

type Props = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignUpPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const afterAuth = safeAuthRedirectPath(redirect_url, "/account");

  return (
    <AuthLayout
      imageSrc={IMAGES.signUp}
      imageAlt="Cookie Bite — دب بسمة مع كوكيز تدور حوله"
      imageClassName="object-cover object-[center_20%]"
      showAlternateAuth={false}
      compactMobilePreview
    >
      <ClerkSmartCaptcha />
      <SignUpForm afterAuth={afterAuth} />
    </AuthLayout>
  );
}
