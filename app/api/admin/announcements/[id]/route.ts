import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  deleteAnnouncement,
  getAnnouncementById,
  updateAnnouncement,
} from "@/lib/announcements/server";
import {
  ANNOUNCEMENT_TYPES,
  TARGET_PAGES,
  normalizeAbTest,
  normalizeAudience,
  normalizeFrequency,
  normalizeTrigger,
} from "@/lib/announcements/shared";
import type { AnnouncementUpdateInput } from "@/lib/announcements/types";

const updateSchema = z
  .object({
    type: z.enum(ANNOUNCEMENT_TYPES as [string, ...string[]]).optional(),
    title_en: z.string().min(1).optional(),
    title_ar: z.string().min(1).optional(),
    message_en: z.string().min(1).optional(),
    message_ar: z.string().min(1).optional(),
    cta_label_en: z.string().nullable().optional(),
    cta_label_ar: z.string().nullable().optional(),
    cta_url: z.string().nullable().optional(),
    priority: z.number().int().min(0).max(100).optional(),
    status: z.enum(["active", "scheduled", "expired", "draft"]).optional(),
    start_at: z.string().nullable().optional(),
    end_at: z.string().nullable().optional(),
    target_pages: z.array(z.enum(TARGET_PAGES as [string, ...string[]])).optional(),
    audience: z.record(z.string(), z.unknown()).optional(),
    trigger_config: z.record(z.string(), z.unknown()).optional(),
    frequency: z.record(z.string(), z.unknown()).optional(),
    dismissible: z.boolean().optional(),
    variant: z.enum(["success", "warning", "error", "info"]).nullable().optional(),
    design: z.record(z.string(), z.unknown()).optional(),
    ab_test: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field required",
  });

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await requireAdminAccess("cms");
  const { id } = await context.params;
  const announcement = await getAnnouncementById(id);
  if (!announcement) {
    return NextResponse.json(
      { error: { en: "Not found", ar: "غير موجود" } },
      { status: 404 },
    );
  }
  return NextResponse.json({ announcement });
}

export async function PUT(request: Request, context: RouteContext) {
  const actor = await requireAdminAccess("cms");
  const { id } = await context.params;
  const before = await getAnnouncementById(id);
  if (!before) {
    return NextResponse.json(
      { error: { en: "Not found", ar: "غير موجود" } },
      { status: 404 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { en: "Invalid JSON", ar: "JSON غير صالح" } },
      { status: 400 },
    );
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { en: "Validation failed", ar: "فشل التحقق من البيانات" } },
      { status: 400 },
    );
  }

  const patch: AnnouncementUpdateInput = {
    ...parsed.data,
    type: parsed.data.type as AnnouncementUpdateInput["type"],
    target_pages: parsed.data.target_pages as AnnouncementUpdateInput["target_pages"],
    audience: parsed.data.audience
      ? normalizeAudience(parsed.data.audience)
      : undefined,
    trigger_config: parsed.data.trigger_config
      ? normalizeTrigger(parsed.data.trigger_config)
      : undefined,
    frequency: parsed.data.frequency
      ? normalizeFrequency(parsed.data.frequency)
      : undefined,
    ab_test:
      parsed.data.ab_test !== undefined
        ? normalizeAbTest(parsed.data.ab_test)
        : undefined,
  };

  const announcement = await updateAnnouncement(id, patch);

  await writeAuditLog({
    actor: {
      user_id: actor.user_id,
      email: actor.email,
      role: actor.role,
    },
    action: "announcements.update",
    module: "cms",
    entity_id: id,
    before,
    after: announcement,
    request,
  });

  return NextResponse.json({ announcement, ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const actor = await requireAdminAccess("cms");
  const { id } = await context.params;
  const before = await getAnnouncementById(id);
  if (!before) {
    return NextResponse.json(
      { error: { en: "Not found", ar: "غير موجود" } },
      { status: 404 },
    );
  }

  await deleteAnnouncement(id);

  await writeAuditLog({
    actor: {
      user_id: actor.user_id,
      email: actor.email,
      role: actor.role,
    },
    action: "announcements.delete",
    module: "cms",
    entity_id: id,
    before,
    request,
  });

  return NextResponse.json({ ok: true });
}
