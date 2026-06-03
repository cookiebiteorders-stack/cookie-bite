import { cookies } from "next/headers";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import type { Lang } from "@/lib/i18n/translations";

export async function getLangFromCookies(): Promise<Lang> {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "en" ? "en" : "ar";
}
