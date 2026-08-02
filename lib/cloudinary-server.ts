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
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  // Comprehensive validation with helpful error messages
  if (!cloudinaryUrl && (!apiKey || !apiSecret || !cloudName)) {
    const missing = [];
    if (!cloudinaryUrl) missing.push("CLOUDINARY_URL");
    if (!apiKey) missing.push("CLOUDINARY_API_KEY");
    if (!apiSecret) missing.push("CLOUDINARY_API_SECRET");
    if (!cloudName) missing.push("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME");
    
    throw new Error(
      `Cloudinary credentials not configured. Missing: ${missing.join(", ")}. ` +
      `Provide either CLOUDINARY_URL or individual credentials (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).`
    );
  }

  // If CLOUDINARY_URL is provided, extract credentials from it
  if (cloudinaryUrl && (!apiKey || !apiSecret || !cloudName)) {
    try {
      const url = new URL(cloudinaryUrl);
      const extractedApiKey = url.username;
      const extractedSecret = url.password;
      const extractedCloudName = url.hostname.split('.')[0];
      
      if (extractedApiKey && extractedSecret && extractedCloudName) {
        return signCloudinaryUploadWithCredentials(
          extractedApiKey,
          extractedSecret,
          extractedCloudName,
          params
        );
      }
    } catch (error) {
      throw new Error(`Invalid CLOUDINARY_URL format: ${cloudinaryUrl}`);
    }
  }

  return signCloudinaryUploadWithCredentials(apiKey!, apiSecret!, cloudName!, params);
}

function signCloudinaryUploadWithCredentials(
  apiKey: string,
  apiSecret: string,
  cloudName: string,
  params: SignParams = {}
) {
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
