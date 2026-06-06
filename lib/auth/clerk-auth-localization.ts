import type { arSA, enUS } from "@clerk/localizations";
import type { Lang } from "@/lib/i18n/translations";

type ClerkLocalization = typeof enUS;
type ClerkLocalePack = typeof enUS;

/** يظهر في عناوين Clerk وصفحة تسجيل الدخول بدل اسم التطبيق من لوحة Clerk. */
export const SITE_HOST = "cookie-bite.com";

/** @deprecated استخدم getAuthCopy(lang) أو مفاتيح auth.* في translations */
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

const EN_COPY = {
  signInTitle: SIGN_IN_TITLE,
  signInSub: SIGN_IN_SUBTITLE,
  signUpTitle: SIGN_UP_TITLE,
  signUpSub: SIGN_UP_SUBTITLE,
};

const AR_COPY = {
  signInTitle: "أهلاً بعودتك",
  signInSub:
    "سجّل دخولك لمتابعة طلباتك وتسريع الدفع — بالبريد أو حسابك الاجتماعي.",
  signUpTitle: "أنشئ حسابك",
  signUpSub: "انضم إلى Cookie Bite — تاريخ طلباتك وعناوينك في مكان واحد.",
};

function buildCookieBiteClerkLocalization(
  base: ClerkLocalePack,
  copy: typeof EN_COPY,
): ClerkLocalization {
  return {
    ...base,
    signIn: {
      ...base.signIn!,
      alternativePhoneCodeProvider: {
        ...base.signIn!.alternativePhoneCodeProvider,
        subtitle: `Continue to ${SITE_HOST}`,
      },
      emailCode: {
        ...base.signIn!.emailCode,
        subtitle: `We sent a code to your inbox for ${SITE_HOST}`,
      },
      emailCodeMfa: {
        ...base.signIn!.emailCodeMfa,
        subtitle: `Verify it’s you on ${SITE_HOST}`,
      },
      emailLink: {
        ...base.signIn!.emailLink,
        subtitle: `Open the link we emailed for ${SITE_HOST}`,
      },
      emailLinkMfa: {
        ...base.signIn!.emailLinkMfa,
        subtitle: `Confirm sign-in to ${SITE_HOST}`,
      },
      phoneCode: {
        ...base.signIn!.phoneCode,
        subtitle: `Enter the code for ${SITE_HOST}`,
      },
      start: {
        ...base.signIn!.start,
        title: copy.signInTitle,
        titleCombined: `Continue to ${SITE_HOST}`,
        subtitle: "Use email, Google, Apple, or X — secured end-to-end.",
        alternativePhoneCodeProvider: {
          ...(base.signIn!.start?.alternativePhoneCodeProvider ?? {}),
          title: `Sign in with {{provider}}`,
        },
      },
      password: {
        ...base.signIn!.password,
        title: "Enter your password",
        subtitle:
          "Type it in the language you chose — Arabic or English. Min. 8 characters.",
      },
      forgotPassword: {
        ...base.signIn!.forgotPassword,
        title: "Reset your password",
        subtitle: `We’ll help you back into ${SITE_HOST}`,
      },
    },
    signUp: {
      ...base.signUp!,
      emailLink: {
        ...base.signUp!.emailLink,
        subtitle: `Confirm your email for ${SITE_HOST}`,
      },
      start: {
        ...base.signUp!.start,
        title: copy.signUpTitle,
        subtitle: "Pick email or a social account — takes under a minute.",
        subtitleCombined: "Pick email or a social account — takes under a minute.",
        alternativePhoneCodeProvider: {
          ...(base.signUp!.start?.alternativePhoneCodeProvider ?? {}),
          title: `Sign up with {{provider}}`,
        },
      },
      emailCode: {
        ...base.signUp!.emailCode,
        subtitle: "Enter the code we sent to verify your email",
      },
      continue: {
        ...base.signUp!.continue,
        title: "Almost there",
        subtitle:
          "Add your details to finish. Password: 8+ chars in Arabic or English as you type.",
      },
    },
    userProfile: {
      ...base.userProfile,
      navbar: {
        ...base.userProfile?.navbar,
        title: "Your account",
        description: "Profile & security for Cookie Bite",
      },
    },
  };
}

function buildCookieBiteClerkLocalizationAr(
  base: ClerkLocalePack,
  copy: typeof AR_COPY,
): ClerkLocalization {
  return {
    ...base,
    signIn: {
      ...base.signIn!,
      start: {
        ...base.signIn!.start,
        title: copy.signInTitle,
        titleCombined: `تابع إلى ${SITE_HOST}`,
        subtitle: "البريد أو Google أو Apple أو X — آمن من البداية للنهاية.",
      },
      password: {
        ...base.signIn!.password,
        title: "أدخل كلمة المرور",
        subtitle: "اكتبها بنفس لغة الكتابة — عربي أو إنجليزي. 8 أحرف على الأقل.",
      },
      forgotPassword: {
        ...base.signIn!.forgotPassword,
        title: "إعادة تعيين كلمة المرور",
        subtitle: `سنساعدك على العودة إلى ${SITE_HOST}`,
      },
    },
    signUp: {
      ...base.signUp!,
      start: {
        ...base.signUp!.start,
        title: copy.signUpTitle,
        subtitle: "البريد أو حساب اجتماعي — أقل من دقيقة.",
        subtitleCombined: "البريد أو حساب اجتماعي — أقل من دقيقة.",
      },
      emailCode: {
        ...base.signUp!.emailCode,
        subtitle: "أدخل الرمز الذي أرسلناه إلى بريدك",
      },
      continue: {
        ...base.signUp!.continue,
        title: "خطوة أخيرة",
        subtitle:
          "أكمل بياناتك. كلمة المرور: 8 أحرف على الأقل بالعربية أو الإنجليزية كما تكتب.",
      },
    },
    userProfile: {
      ...base.userProfile,
      navbar: {
        ...base.userProfile?.navbar,
        title: "حسابك",
        description: "الملف الشخصي والأمان — كوكي بايت",
      },
    },
  };
}

/** يحمّل حزمة Clerk للغة النشطة فقط — لا يجلب ar+en معاً. */
export async function getClerkLocalization(lang: Lang): Promise<ClerkLocalization> {
  if (lang === "ar") {
    const { arSA: arPack } = await import("@clerk/localizations");
    return buildCookieBiteClerkLocalizationAr(arPack, AR_COPY);
  }
  const { enUS: enPack } = await import("@clerk/localizations");
  return buildCookieBiteClerkLocalization(enPack, EN_COPY);
}
