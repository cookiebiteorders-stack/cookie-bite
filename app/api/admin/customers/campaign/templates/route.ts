import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listTemplates } from "@/lib/notification-library";

export async function GET() {
  await requireAdminAccess("customers");
  const supabase = createSupabaseAdminClient();

  const library = listTemplates()
    .filter((t) => ["marketing", "retention", "lifecycle"].includes(t.category))
    .map((t) => ({
      key: t.key,
      name: t.name,
      category: t.category,
      source: "library" as const,
    }));

  const { data: dbRows } = await supabase
    .from("email_templates")
    .select("key,name,category,is_active")
    .eq("is_active", true)
    .order("name");

  const db = (dbRows ?? []).map((r) => ({
    key: r.key as string,
    name: r.name as string,
    category: (r.category as string) ?? "transactional",
    source: "db" as const,
  }));

  const seen = new Set<string>();
  const templates = [...library, ...db].filter((t) => {
    const id = `${t.source}:${t.key}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return NextResponse.json({ ok: true, templates });
}
