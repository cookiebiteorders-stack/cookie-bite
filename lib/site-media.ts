/**
 * فيديو الهيرو — اضبط `HERO_VIDEO_SRC` على المسار الفعلي عند توفّره
 * داخل `public/videos/...`. اتركه `null` لاستخدام صورة الخلفية فقط
 * بدون طلب 404.
 */
export const HERO_VIDEO_SRC: string | null = null;

/**
 * صورة الهيرو — محلية أولاً (أسرع LCP)، ثم Unsplash كاحتياط.
 * ضع الملف في `public/images/hero.webp` أو `.jpg`.
 */
export const HERO_FALLBACK_IMAGE = "/images/hero.webp";

/** احتياط خارجي إن لم تُرفع الصورة المحلية بعد. */
export const HERO_FALLBACK_IMAGE_REMOTE =
  "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1280&q=75&fm=webp";
