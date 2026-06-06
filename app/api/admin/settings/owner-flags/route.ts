import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireOwnerAccess } from "@/lib/admin/require-admin";
import {
  OWNER_FLAG_KEYS,
  OWNER_FLAG_LABELS,
  parseOwnerFlagsPatch,
  type OwnerFlags,
} from "@/lib/store/owner-flags";
import { getOwnerFlags, updateOwnerFlags } from "@/lib/store/owner-flags-server";

export async function GET() {
  const actor = await requireOwnerAccess("settings");
  const flags = await getOwnerFlags();
  return NextResponse.json({
    flags,
    keys: OWNER_FLAG_KEYS,
    labels: OWNER_FLAG_LABELS,
    actor: { role: actor.role },
  });
}

export async function PATCH(request: Request) {
  const actor = await requireOwnerAccess("settings");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { en: "Invalid JSON", ar: "JSON غير صالح" } },
      { status: 400 },
    );
  }

  const patch = parseOwnerFlagsPatch(body);
  if (!patch) {
    return NextResponse.json(
      { error: { en: "No valid flags in body", ar: "لا توجد أعلام صالحة في الطلب" } },
      { status: 400 },
    );
  }

  const before = await getOwnerFlags();
  const flags = await updateOwnerFlags(patch, actor.user_id);

  await writeAuditLog({
    actor: {
      user_id: actor.user_id,
      email: actor.email,
      role: actor.role,
    },
    action: "settings.owner_flags.update",
    module: "settings",
    entity_id: "global",
    before,
    after: flags,
    metadata: { patch },
    request,
  });

  return NextResponse.json({ flags, ok: true });
}

/** Toggle one flag — `{ key, enabled }` */
export async function POST(request: Request) {
  const actor = await requireOwnerAccess("settings");
  let body: { key?: string; enabled?: boolean };
  try {
    body = (await request.json()) as { key?: string; enabled?: boolean };
  } catch {
    return NextResponse.json(
      { error: { en: "Invalid JSON", ar: "JSON غير صالح" } },
      { status: 400 },
    );
  }

  const key = body.key;
  if (!key || typeof body.enabled !== "boolean" || !(OWNER_FLAG_KEYS as readonly string[]).includes(key)) {
    return NextResponse.json(
      { error: { en: "Invalid flag key or enabled value", ar: "مفتاح أو قيمة غير صالحة" } },
      { status: 400 },
    );
  }

  const before = await getOwnerFlags();
  const flags = await updateOwnerFlags(
    { [key]: body.enabled } as Partial<OwnerFlags>,
    actor.user_id,
  );

  await writeAuditLog({
    actor: {
      user_id: actor.user_id,
      email: actor.email,
      role: actor.role,
    },
    action: "settings.owner_flags.toggle",
    module: "settings",
    entity_id: key,
    before,
    after: flags,
    metadata: { key, enabled: body.enabled },
    request,
  });

  if (key === "smart_retries" && body.enabled) {
    void import("@/lib/admin/automation/run-job").then((m) =>
      m.runAutomationJob("email_worker", 25).catch((err) => {
        console.error("[owner-flags] smart_retries drain failed", err);
      }),
    );
  }

  return NextResponse.json({ flags, ok: true });
}
