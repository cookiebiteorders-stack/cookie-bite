/**
 * تحليل مشاعر سريع (قواعد + كلمات مفتاحية) — يغذي توجيه الشخصية.
 * النطاق: -1 (سلبي جداً) → +1 (إيجابي جداً)
 */
export function scoreSentiment(message: string): number {
  const text = message.trim().toLowerCase();
  if (!text) return 0;

  const negative = [
    "angry",
    "furious",
    "terrible",
    "awful",
    "worst",
    "refund",
    "complaint",
    "broken",
    "late",
    "never",
    "disappointed",
    "scam",
    "غاضب",
    "زعلان",
    "سيء",
    "سيئة",
    "فظيع",
    "مسترجع",
    "استرجاع",
    "شكوى",
    "تأخير",
    "متأخر",
    "خربان",
    "مكسور",
    "محبط",
    "نصب",
  ];
  const positive = [
    "love",
    "great",
    "amazing",
    "perfect",
    "thanks",
    "thank you",
    "excited",
    "yay",
    "حبيت",
    "رائع",
    "ممتاز",
    "شكرا",
    "شكراً",
    "جميل",
    "حلو",
    "مبسوط",
    "سعيد",
  ];

  let score = 0;
  for (const w of negative) {
    if (text.includes(w)) score -= 0.35;
  }
  for (const w of positive) {
    if (text.includes(w)) score += 0.3;
  }

  if (/!{2,}/.test(message)) score += 0.15;
  if (/\?{2,}/.test(message)) score -= 0.05;

  return Math.max(-1, Math.min(1, Math.round(score * 100) / 100));
}
