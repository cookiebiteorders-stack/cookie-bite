import { cookies } from "next/headers";
import { cache } from "react";
import { LANG_COOKIE } from "@/lib/preferences/client-cookies";
import type { Lang } from "@/lib/i18n/translations";

/** يُستدعى عدة مرات في نفس الطلب — قراءة واحدة للكوكي. */
export const getLangFromCookies = cache(async (): Promise<Lang> => {
  const store = await cookies();
  return store.get(LANG_COOKIE)?.value === "en" ? "en" : "ar";
});
