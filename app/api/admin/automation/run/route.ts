import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { isAutomationJobId } from "@/lib/admin/automation/registry";
import { runAutomationJob } from "@/lib/admin/automation/run-job";
import { writeAuditLog } from "@/lib/admin/audit";
import { bilingualError } from "@/lib/validations";

const bodySchema = z.object({
  job: z.string(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const actor = await requireAdminAccess("settings");
  requireWritePermission(actor);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isAutomationJobId(parsed.data.job)) {
    return NextResponse.json(bilingualError("Invalid job", "مهمة غير صالحة"), { status: 400 });
  }

  try {
    const result = await runAutomationJob(parsed.data.job, parsed.data.limit ?? 25);

    await writeAuditLog({
      actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
      action: "settings.automation_run",
      module: "settings",
      entity_id: parsed.data.job,
      metadata: { result },
      request: req,
    });

    return NextResponse.json({ ok: true, job: parsed.data.job, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "run_failed";
    return NextResponse.json(bilingualError(msg, msg), { status: 500 });
  }
}
