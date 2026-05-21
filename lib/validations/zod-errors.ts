import type { ZodError } from "zod";
import { bilingualError } from "@/lib/validations";

/** Human-readable validation message for admin APIs (EN + AR). */
export function zodPayloadError(error: ZodError) {
  const lines = error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "body";
    return `${path}: ${i.message}`;
  });
  const detail = lines.slice(0, 6).join(" · ");
  return bilingualError(
    detail ? `Invalid payload — ${detail}` : "Invalid payload",
    detail ? `بيانات غير صالحة — ${detail}` : "بيانات غير صالحة",
  );
}
