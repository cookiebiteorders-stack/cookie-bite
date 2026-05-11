"use client";

import { useEffect, useMemo, useState } from "react";
import { SignIn } from "@clerk/nextjs";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { getDesktopSocialPopupPreference, AUTH_SOCIAL_POPUP_DESKTOP_KEY } from "@/lib/auth/social-preferences";

type SignInFormProps = {
  afterAuth: string;
};

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(
    navigator.userAgent,
  );
}

export function SignInForm({ afterAuth }: SignInFormProps) {
  const [desktopPopupEnabled, setDesktopPopupEnabled] = useState(() =>
    getDesktopSocialPopupPreference(),
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === AUTH_SOCIAL_POPUP_DESKTOP_KEY) {
        setDesktopPopupEnabled(getDesktopSocialPopupPreference());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const oauthFlow = useMemo(() => {
    if (isMobileDevice()) return "redirect";
    return desktopPopupEnabled ? "popup" : "redirect";
  }, [desktopPopupEnabled]);

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      appearance={clerkAuthAppearance}
      oauthFlow={oauthFlow}
      oidcPrompt="select_account"
      fallbackRedirectUrl={afterAuth}
      forceRedirectUrl={afterAuth}
      signUpFallbackRedirectUrl={afterAuth}
      signUpForceRedirectUrl={afterAuth}
    />
  );
}

