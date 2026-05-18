import { enUS } from "@clerk/localizations";

/** يظهر في عناوين Clerk وصفحة تسجيل الدخول بدل اسم التطبيق من لوحة Clerk. */
export const SITE_HOST = "cookie-bite.com";

export const SIGN_IN_TITLE = `Sign in to ${SITE_HOST}`;
export const SIGN_IN_SUBTITLE =
  "Sign in with email or Google, Apple, or X — your connection is encrypted.";

/**
 * نسخة إنجليزية مخصصة لـ Cookie Bite — تستبدل اسم التطبيق الافتراضي من لوحة Clerk
 * وتقلل الالتباس بين العناوين داخل البطاقة.
 */
export const cookieBiteClerkLocalization = {
  ...enUS,
  signIn: {
    ...enUS.signIn!,
    alternativePhoneCodeProvider: {
      ...enUS.signIn!.alternativePhoneCodeProvider,
      subtitle: `to continue to ${SITE_HOST}`,
    },
    emailCode: {
      ...enUS.signIn!.emailCode,
      subtitle: `to continue to ${SITE_HOST}`,
    },
    emailCodeMfa: {
      ...enUS.signIn!.emailCodeMfa,
      subtitle: `to continue to ${SITE_HOST}`,
    },
    emailLink: {
      ...enUS.signIn!.emailLink,
      subtitle: `to continue to ${SITE_HOST}`,
    },
    emailLinkMfa: {
      ...enUS.signIn!.emailLinkMfa,
      subtitle: `to continue to ${SITE_HOST}`,
    },
    phoneCode: {
      ...enUS.signIn!.phoneCode,
      subtitle: `to continue to ${SITE_HOST}`,
    },
    start: {
      ...enUS.signIn!.start,
      title: SIGN_IN_TITLE,
      titleCombined: `Continue to ${SITE_HOST}`,
      subtitle: SIGN_IN_SUBTITLE,
      alternativePhoneCodeProvider: {
        ...(enUS.signIn!.start?.alternativePhoneCodeProvider ?? {}),
        title: `Sign in to ${SITE_HOST} with {{provider}}`,
      },
    },
  },
  signUp: {
    ...enUS.signUp!,
    emailLink: {
      ...enUS.signUp!.emailLink,
      subtitle: `to continue to ${SITE_HOST}`,
    },
    start: {
      ...enUS.signUp!.start,
      title: `Sign up to ${SITE_HOST}`,
      subtitle:
        "Save addresses and track orders — one account for gifts and treats.",
      subtitleCombined:
        "Save addresses and track orders — one account for gifts and treats.",
      alternativePhoneCodeProvider: {
        ...(enUS.signUp!.start?.alternativePhoneCodeProvider ?? {}),
        title: `Sign up to ${SITE_HOST} with {{provider}}`,
      },
    },
  },
};
