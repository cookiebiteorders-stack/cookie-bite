import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

export type SessionRefreshResult = {
  response: NextResponse;
  user: User | null;
};

/** يحدّث جلسة Supabase Auth على كل طلب محمي — مطلوب لـ SSR و middleware. */
export async function updateSupabaseSession(request: NextRequest): Promise<SessionRefreshResult> {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return { response, user: null };
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // IMPORTANT: request.cookies is immutable in Next.js middleware/Edge contexts.
        // Mutating request.cookies (e.g. request.cookies.set) will throw.
        // Set cookies only on the response object so they are sent to the client.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
