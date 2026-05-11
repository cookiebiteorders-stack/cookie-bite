import { SignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/auth-layout";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { ClerkSmartCaptcha } from "@/components/auth/clerk-smart-captcha";
import { safeAuthRedirectPath } from "@/lib/auth/safe-redirect";
import { IMAGES } from "@/lib/data";

type Props = {
  searchParams: Promise<{ redirect_url?: string }>;
};

export default async function SignInPage({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const afterAuth = safeAuthRedirectPath(redirect_url, "/account");

  return (
    <AuthLayout
      imageSrc={IMAGES.signIn}
      imageAlt="Cookie Bite — شخصية الكوكيز"
      imageClassName="object-cover object-[center_20%]"
      title="Welcome Back"
      subtitle="Sign in quickly to track orders, manage your account, and continue checkout in seconds."
      switchLabel="New to Cookie Bite?"
      switchHref="/sign-up"
      switchCta="Create account"
    >
      <ClerkSmartCaptcha />
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        appearance={clerkAuthAppearance}
        oauthFlow="redirect"
        fallbackRedirectUrl={afterAuth}
        forceRedirectUrl={afterAuth}
        signUpFallbackRedirectUrl={afterAuth}
        signUpForceRedirectUrl={afterAuth}
      />
    </AuthLayout>
  );
}
