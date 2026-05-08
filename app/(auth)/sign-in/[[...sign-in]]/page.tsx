import { SignIn } from "@clerk/nextjs";
import { AuthSplitLayout } from "@/components/auth/auth-split-layout";
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
    <AuthSplitLayout
      imageSrc={IMAGES.signIn}
      imageAlt="Cookie Bite — شخصية الكوكيز"
      showMobileImageStrip
      imageClassName="object-cover object-[center_20%]"
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
    </AuthSplitLayout>
  );
}
