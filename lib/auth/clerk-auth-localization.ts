import { enUS } from "@clerk/localizations";

/** يظهر في عناوين Clerk وصفحة تسجيل الدخول بدل اسم التطبيق من لوحة Clerk. */
export const SITE_HOST = "cookie-bite.com";

export const SIGN_IN_TITLE = "Welcome back";
export const SIGN_IN_SUBTITLE =
  "Sign in to track orders, save addresses, and checkout faster — email or social in one tap.";

export const SIGN_UP_TITLE = "Create your account";
export const SIGN_UP_SUBTITLE =
  "Join Cookie Bite for order history, saved delivery spots, and treats made just for you.";

export const AUTH_SWITCH_SIGN_IN_LABEL = "Already part of the bakery?";
export const AUTH_SWITCH_SIGN_IN_CTA = "Sign in";
export const AUTH_SWITCH_SIGN_UP_LABEL = "New here?";
export const AUTH_SWITCH_SIGN_UP_CTA = "Create free account";

/**
 * نسخة إنجليزية مخصصة لـ Cookie Bite — نبرة دافئة ومتسقة مع العلامة.
 */
export const cookieBiteClerkLocalization = {
  ...enUS,
  signIn: {
    ...enUS.signIn!,
    alternativePhoneCodeProvider: {
      ...enUS.signIn!.alternativePhoneCodeProvider,
      subtitle: `Continue to ${SITE_HOST}`,
    },
    emailCode: {
      ...enUS.signIn!.emailCode,
      subtitle: `We sent a code to your inbox for ${SITE_HOST}`,
    },
    emailCodeMfa: {
      ...enUS.signIn!.emailCodeMfa,
      subtitle: `Verify it’s you on ${SITE_HOST}`,
    },
    emailLink: {
      ...enUS.signIn!.emailLink,
      subtitle: `Open the link we emailed for ${SITE_HOST}`,
    },
    emailLinkMfa: {
      ...enUS.signIn!.emailLinkMfa,
      subtitle: `Confirm sign-in to ${SITE_HOST}`,
    },
    phoneCode: {
      ...enUS.signIn!.phoneCode,
      subtitle: `Enter the code for ${SITE_HOST}`,
    },
    start: {
      ...enUS.signIn!.start,
      title: SIGN_IN_TITLE,
      titleCombined: `Continue to ${SITE_HOST}`,
      subtitle: "Use email, Google, Apple, or X — secured end-to-end.",
      alternativePhoneCodeProvider: {
        ...(enUS.signIn!.start?.alternativePhoneCodeProvider ?? {}),
        title: `Sign in with {{provider}}`,
      },
    },
    password: {
      ...enUS.signIn!.password,
      title: "Enter your password",
      subtitle: "For your Cookie Bite account",
    },
    forgotPassword: {
      ...enUS.signIn!.forgotPassword,
      title: "Reset your password",
      subtitle: `We’ll help you back into ${SITE_HOST}`,
    },
  },
  signUp: {
    ...enUS.signUp!,
    emailLink: {
      ...enUS.signUp!.emailLink,
      subtitle: `Confirm your email for ${SITE_HOST}`,
    },
    start: {
      ...enUS.signUp!.start,
      title: SIGN_UP_TITLE,
      subtitle: "Pick email or a social account — takes under a minute.",
      subtitleCombined: "Pick email or a social account — takes under a minute.",
      alternativePhoneCodeProvider: {
        ...(enUS.signUp!.start?.alternativePhoneCodeProvider ?? {}),
        title: `Sign up with {{provider}}`,
      },
    },
    emailCode: {
      ...enUS.signUp!.emailCode,
      subtitle: "Enter the code we sent to verify your email",
    },
    continue: {
      ...enUS.signUp!.continue,
      title: "Almost there",
      subtitle: "Add your details to finish your Cookie Bite account",
    },
  },
  userProfile: {
    ...enUS.userProfile,
    navbar: {
      ...enUS.userProfile?.navbar,
      title: "Your account",
      description: "Profile & security for Cookie Bite",
    },
  },
};
