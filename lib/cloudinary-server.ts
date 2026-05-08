/**
 * توقيع رفع موقّع من السيرفر — للاستخدام في Server Actions / Route Handlers فقط.
 * يستهلك `CLOUDINARY_API_KEY` و`CLOUDINARY_API_SECRET` من البيئة.
 */
import crypto from "node:crypto";

type SignParams = Record<string, string | number | undefined>;

export function signCloudinaryUpload(params: SignParams = {}) {
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!apiKey || !apiSecret || !cloudName) {
    throw new Error("Missing Cloudinary credentials");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const merged: SignParams = { timestamp, ...params };

  const sortedString = Object.keys(merged)
    .filter((k) => merged[k] !== undefined && merged[k] !== "")
    .sort()
    .map((k) => `${k}=${merged[k]}`)
    .join("&");

  const signature = crypto
    .createHash("sha1")
    .update(sortedString + apiSecret)
    .digest("hex");

  return { signature, timestamp, apiKey, cloudName };
}
