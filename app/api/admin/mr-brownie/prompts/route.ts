import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin/require-admin";
import {
  listPersonaPromptsForAdmin,
  savePersonaPrompt,
} from "@/lib/mr-brownie/persona-prompts";
import { bilingualError } from "@/lib/validations";

const patchSchema = z.object({
  persona: z.enum(["mr_brownie"]),
  locale: z.enum(["ar", "en", "any"]),
  variant: z.enum(["a", "b"]).default("a"),
  instruction: z.string().min(20).max(8000),
  is_published: z.boolean(),
});

export async function GET() {
  await requireAdminAccess("settings");
  const prompts = await listPersonaPromptsForAdmin();
  return NextResponse.json({ prompts });
}

export async function PATCH(req: NextRequest) {
  const actor = await requireAdminAccess("settings");

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  const updatedBy = actor.email ?? actor.supabase_user_id ?? null;

  const result = await savePersonaPrompt({
    ...parsed.data,
    updated_by: updatedBy,
  });

  if (!result.ok) {
    return NextResponse.json(
      bilingualError(result.error, "تعذر حفظ البرومبت"),
      { status: 503 },
    );
  }

  const prompts = await listPersonaPromptsForAdmin();
  return NextResponse.json({ ok: true, prompts });
}
