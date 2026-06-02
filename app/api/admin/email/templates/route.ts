import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractTemplateVariables } from "@/lib/email/automation/template-renderer";

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(2).max(120),
  name: z.string().min(2).max(140),
  subject: z.string().min(1).max(220),
  html_content: z.string().min(1),
  variables: z.array(z.string().min(1).max(80)).optional(),
  is_active: z.boolean().default(true),
});

export async function GET() {
  await requireAdminAccess("settings");
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("id,key,name,subject,html_body,variables,is_active,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const templates = (data ?? []).map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    subject: row.subject,
    html_content: row.html_body,
    variables: Array.isArray(row.variables) ? row.variables : [],
    is_active: row.is_active,
    updated_at: row.updated_at,
  }));

  return NextResponse.json({ ok: true, templates });
}

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);
  const parsed = templateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const payload = parsed.data;
  const discovered = extractTemplateVariables(payload.html_content);
  const mergedVars = Array.from(new Set([...(payload.variables ?? []), ...discovered]));
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("email_templates")
    .upsert(
      {
        ...(payload.id ? { id: payload.id } : {}),
        key: payload.key,
        name: payload.name,
        subject: payload.subject,
        html_body: payload.html_content,
        variables: mergedVars,
        is_active: payload.is_active,
        category: "transactional",
      },
      { onConflict: "key,language" },
    )
    .select("id,key,name,subject,html_body,variables,is_active,updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message ?? "save_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    template: {
      id: data.id,
      key: data.key,
      name: data.name,
      subject: data.subject,
      html_content: data.html_body,
      variables: data.variables,
      is_active: data.is_active,
      updated_at: data.updated_at,
    },
  });
}
