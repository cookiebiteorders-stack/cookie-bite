import { enUS } from "@clerk/localizations";

/**
 * نسخة إنجليزية مخصصة لـ Cookie Bite — تستبدل اسم التطبيق الافتراضي من لوحة Clerk
 * وتقلل الالتباس بين العناوين داخل البطاقة.
 */
export const cookieBiteClerkLocalization = {
  ...enUS,
  signIn: {
    ...enUS.signIn!,
    start: {
      ...enUS.signIn!.start,
      title: "Welcome back",
      subtitle:
        "Sign in with email or Google, Apple, or X — your connection is encrypted.",
    },
  },
  signUp: {
    ...enUS.signUp!,
    start: {
      ...enUS.signUp!.start,
      title: "Create your account",
      subtitle:
        "Save addresses and track orders — one account for gifts and treats.",
    },
  },
};
