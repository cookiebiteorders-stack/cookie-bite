import "@/lib/server-only";

/** BullMQ — اختياري؛ عند غياب Redis يُفضَّل طابور DB + cron. */
export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

/**
 * معالجة صفوف email_queue عبر cron / «تشغيل الآن».
 * افتراضياً مفعّل (.env.example)؛ عطّله بـ EMAIL_USE_DB_QUEUE=false.
 */
export function isEmailDbQueueEnabled(): boolean {
  return process.env.EMAIL_USE_DB_QUEUE !== "false";
}

export function isEmailQueueEnabled(): boolean {
  if (process.env.EMAIL_USE_QUEUE === "false") return false;
  return isRedisConfigured() || isEmailDbQueueEnabled();
}
