import { bilingualError } from "@/lib/validations";

/**
 * ترجمة أخطاء Resend الشائعة لرسائل ثنائية اللغة في لوحة الإدارة.
 */
export function mapResendApiError(message: string): { en: string; ar: string; code?: string } {
  const m = message.trim();
  if (/restricted to only send/i.test(m)) {
    return {
      code: "resend_send_only_key",
      en: "This Resend API key is send-only. Create a Full Access key at resend.com/api-keys (Contacts permission), or set RESEND_CONTACTS_ENABLED=false and use Resend dashboard for audiences.",
      ar: "مفتاح Resend مقيّد بالإرسال فقط. أنشئ مفتاح Full Access من resend.com/api-keys (صلاحية Contacts)، أو عطّل RESEND_CONTACTS_ENABLED=false وأدر الجمهور من لوحة Resend.",
    };
  }
  if (/not authorized|unauthorized|401/i.test(m)) {
    return {
      code: "resend_unauthorized",
      en: "Resend rejected the API key. Check RESEND_API_KEY in hPanel.",
      ar: "رفض Resend مفتاح API. تحقق من RESEND_API_KEY في hPanel.",
    };
  }
  return { en: m, ar: m };
}

export function isResendSendOnlyKeyError(message: string): boolean {
  return /restricted to only send/i.test(message);
}

/** هل واجهة إدارة جهات الاتصال مسموحة؟ */
export function isResendContactsManagementEnabled(): boolean {
  if (process.env.RESEND_CONTACTS_ENABLED === "false") return false;
  return true;
}

export function resendApiErrorPayload(message: string) {
  const mapped = mapResendApiError(message);
  return {
    ...bilingualError(mapped.en, mapped.ar),
    ...(mapped.code ? { error_code: mapped.code } : {}),
  };
}
