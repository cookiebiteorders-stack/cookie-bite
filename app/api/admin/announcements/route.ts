import { NextResponse } from "next/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  createAnnouncement,
  getAllAnnouncementsAdmin,
} from "@/lib/announcements/server";
import {
  ANNOUNCEMENT_TYPES,
  TARGET_PAGES,
  defaultFrequencyForType,
  normalizeAbTest,
  normalizeAudience,
  normalizeFrequency,
  normalizeTrigger,
} from "@/lib/announcements/shared";
import type { AnnouncementCreateInput } from "@/lib/announcements/types";

const createSchema = z.object({
  type: z.enum(ANNOUNCEMENT_TYPES as [string, ...string[]]),
  title_en: z.string().min(1),
  title_ar: z.string().min(1),
  message_en: z.string().min(1),
  message_ar: z.string().min(1),
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
});

export async function GET() {
  await requireAdminAccess("cms");
  const announcements = await getAllAnnouncementsAdmin();
  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const actor = await requireAdminAccess("cms");
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: { en: "Invalid JSON", ar: "JSON غير صالح" } },
      { status: 400 },
    );
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: { en: "Validation failed", ar: "فشل التحقق من البيانات" },
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const input: AnnouncementCreateInput = {
    type: parsed.data.type as AnnouncementCreateInput["type"],
    title_en: parsed.data.title_en,
    title_ar: parsed.data.title_ar,
    message_en: parsed.data.message_en,
    message_ar: parsed.data.message_ar,
    cta_label_en: parsed.data.cta_label_en ?? null,
    cta_label_ar: parsed.data.cta_label_ar ?? null,
    cta_url: parsed.data.cta_url ?? null,
    priority: parsed.data.priority ?? 50,
    status: parsed.data.status ?? "draft",
    start_at: parsed.data.start_at ?? null,
    end_at: parsed.data.end_at ?? null,
    target_pages: (parsed.data.target_pages ?? ["all"]) as AnnouncementCreateInput["target_pages"],
    audience: normalizeAudience(parsed.data.audience ?? { userType: "all" }),
    trigger_config: normalizeTrigger(parsed.data.trigger_config ?? { type: "immediate" }),
    frequency: normalizeFrequency(
      parsed.data.frequency ?? defaultFrequencyForType(parsed.data.type as AnnouncementCreateInput["type"]),
    ),
    dismissible: parsed.data.dismissible ?? true,
    variant: parsed.data.variant ?? null,
    design: parsed.data.design ?? {},
    ab_test: normalizeAbTest(parsed.data.ab_test ?? null),
  };

  const announcement = await createAnnouncement(input, actor.user_id);

  await writeAuditLog({
    actor: {
      user_id: actor.user_id,
      email: actor.email,
      role: actor.role,
    },
    action: "announcements.create",
    module: "cms",
    entity_id: announcement.id,
    after: announcement,
    request,
  });

  return NextResponse.json({ announcement, ok: true });
}
