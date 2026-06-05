import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { requireMrsCookieAccess } from "@/lib/admin/require-admin";
import {
  getCopilotPromptConfig,
  saveCopilotPromptConfig,
} from "@/lib/admin/copilot/copilot-prompt-config";
import { bilingualError } from "@/lib/validations";

const patchSchema = z.object({
  overlay: z.string().max(8000),
  is_published: z.boolean(),
});

export async function GET() {
  try {
    await requireMrsCookieAccess();
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }
  const config = await getCopilotPromptConfig();
  return NextResponse.json({ config });
}

export async function PATCH(req: NextRequest) {
  try {
    await requireMrsCookieAccess();
  } catch (resp) {
    if (resp instanceof Response) return resp;
    throw resp;
  }

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  let updatedBy: string | null = null;
  try {
    const user = await currentUser();
    updatedBy = user?.primaryEmailAddress?.emailAddress ?? user?.id ?? null;
  } catch {
    /* ignore */
  }

  const result = await saveCopilotPromptConfig({ ...parsed.data, updated_by: updatedBy });
  if (!result.ok) {
    return NextResponse.json(bilingualError(result.error, "تعذر حفظ البرومبت"), {
      status: 503,
    });
  }

  const config = await getCopilotPromptConfig();
  return NextResponse.json({ ok: true, config });
}
