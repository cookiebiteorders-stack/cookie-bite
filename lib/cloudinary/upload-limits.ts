/** أقصى حجم يُقبل قبل المعالجة على الخادم (يُصغَّر بعدها). */
export const MAX_IMAGE_UPLOAD_INPUT_BYTES = 30 * 1024 * 1024;

/** بعد الضغط — حد Cloudinary الآمن للصور. */
export const MAX_IMAGE_UPLOAD_OUTPUT_BYTES = 10 * 1024 * 1024;

export const MAX_VIDEO_UPLOAD_BYTES = 48 * 1024 * 1024;

/** أطول ضلع بعد التحجيم (جودة عالية للمنتجات). */
export const IMAGE_UPLOAD_MAX_EDGE = 2560;

/** هدف الضغط على المتصفح قبل الرفع المباشر. */
export const CLIENT_IMAGE_TARGET_BYTES = 4 * 1024 * 1024;
