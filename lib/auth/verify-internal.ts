import { timingSafeEqual } from "node:crypto";

/**
 * تحقق داخلي مقاوم لتسريب التوقيت.
 */
export function verifyInternalSecret(req: Request): boolean {
  const received = req.headers.get("x-internal-secret");
  const expected = process.env.INTERNAL_API_SECRET;
  if (!received || !expected) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
