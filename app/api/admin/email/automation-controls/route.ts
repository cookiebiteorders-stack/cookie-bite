import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EMAIL_EVENT_CATALOG } from "@/lib/email/automation/event-catalog";

export async function GET() {
  await requireAdminAccess("settings");
  const supabase = createSupabaseAdminClient();

  const [{ data: mappings, error: mapErr }, { data: templates, error: tplErr }] = await Promise.all([
    supabase
      .from("email_event_template_mappings")
      .select("id,event_name,template_key,is_active,updated_at")
      .order("event_name", { ascending: true }),
    supabase
      .from("email_templates")
      .select("id,key,name,subject,is_active,updated_at")
      .order("key", { ascending: true }),
  ]);

  if (mapErr || tplErr) {
    return NextResponse.json(
      { ok: false, error: mapErr?.message ?? tplErr?.message ?? "load_failed" },
      { status: 500 },
    );
  }

  const templateByKey = new Map((templates ?? []).map((t) => [String(t.key), t]));

  const events = (mappings ?? []).map((m) => {
    const catalog = EMAIL_EVENT_CATALOG[m.event_name as string];
    const tpl = templateByKey.get(String(m.template_key));
    return {
      id: m.id,
      event_name: m.event_name,
      template_key: m.template_key,
      template_name: tpl?.name ?? null,
      template_active: tpl?.is_active ?? null,
      is_active: m.is_active,
      label_ar: catalog?.labelAr ?? m.event_name,
      label_en: catalog?.labelEn ?? m.event_name,
      description_ar: catalog?.descriptionAr ?? "",
      updated_at: m.updated_at,
    };
  });

  const mappedKeys = new Set((mappings ?? []).map((m) => String(m.template_key)));

  const standaloneTemplates = (templates ?? [])
    .filter((t) => !mappedKeys.has(String(t.key)))
    .map((t) => ({
      id: t.id,
      key: t.key,
      name: t.name,
      subject: t.subject,
      is_active: t.is_active,
      updated_at: t.updated_at,
    }));

  return NextResponse.json({
    ok: true,
    events,
    templates: (templates ?? []).map((t) => ({
      id: t.id,
      key: t.key,
      name: t.name,
      subject: t.subject,
      is_active: t.is_active,
      updated_at: t.updated_at,
    })),
    standalone_templates: standaloneTemplates,
  });
}

const bulkSchema = z.object({
  mappings: z
    .array(
      z.object({
        id: z.string().uuid(),
        is_active: z.boolean(),
      }),
    )
    .optional(),
  templates: z
    .array(
      z.object({
        id: z.string().uuid(),
        is_active: z.boolean(),
      }),
    )
    .optional(),
});

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const { mappings = [], templates = [] } = parsed.data;
  if (mappings.length === 0 && templates.length === 0) {
    return NextResponse.json({ ok: false, error: "empty_update" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let updatedMappings = 0;
  let updatedTemplates = 0;

  for (const item of mappings) {
    const { error } = await supabase
      .from("email_event_template_mappings")
      .update({ is_active: item.is_active })
      .eq("id", item.id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, scope: "mapping", id: item.id }, { status: 500 });
    }
    updatedMappings += 1;
  }

  for (const item of templates) {
    const { error } = await supabase
      .from("email_templates")
      .update({ is_active: item.is_active })
      .eq("id", item.id);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, scope: "template", id: item.id }, { status: 500 });
    }
    updatedTemplates += 1;
  }

  return NextResponse.json({
    ok: true,
    updated_mappings: updatedMappings,
    updated_templates: updatedTemplates,
  });
}
