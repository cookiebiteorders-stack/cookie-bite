/**
 * يؤجّل تنفيذ مهمة تأثير (مثل بدء الجلب) حتى بعد اكتمال commit الحالي،
 * لتفادي تنبيهات react-hooks المتعلقة بـ setState المتزامن داخل جسم effect.
 *
 * مستخدم في صفحات client التي تبدأ تحميل بيانات من useEffect فقط — لا تناسب SSR.
 */

export function scheduleEffectTask(run: () => void): () => void {
  if (typeof requestAnimationFrame === "undefined") {
    const t = setTimeout(run, 0);
    return () => clearTimeout(t);
  }

  const id = requestAnimationFrame(() => {
    run();
  });
  return () => cancelAnimationFrame(id);
}
