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
      imageClassName="object-cover object-[center_25%]"
      title="Create Your Account"
      subtitle="Join Cookie Bite to save addresses, track every order, and unlock a smoother checkout experience."
      switchLabel="Already have an account?"
      switchHref="/sign-in"
      switchCta="Sign in"
    >
      <ClerkSmartCaptcha />
      <SignUpForm afterAuth={afterAuth} />
    </AuthLayout>
  );
}
