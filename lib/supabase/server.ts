import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (err) {
          // In production, fail loudly on cookie write failures
          if (process.env.NODE_ENV === "production") {
            console.error("[Supabase Server Client] Cookie write failed", {
              error: err instanceof Error ? err.message : String(err),
              cookies: cookiesToSet.map(c => c.name),
            });
            throw new Error(`Failed to set auth cookies: ${err instanceof Error ? err.message : String(err)}`);
          }
          // In development, log but don't fail for debugging convenience
          console.warn("[Supabase Server Client] Cookie write failed in development (swallowed)", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
  });
}
