import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  buildAbandonedCartSnapshot,
  upsertAbandonedCart,
} from "@/lib/cart/abandoned";
import type { CartLine } from "@/lib/cart/types";
import { getUserByClerkId } from "@/lib/db/users";

const BodySchema = z.object({
  lines: z.array(z.record(z.string(), z.unknown())).min(1),
  email: z.union([z.string().email(), z.literal("")]).optional(),
  phone: z.string().max(20).optional(),
});

/**
 * POST /api/cart/abandon
 * Saves or updates an abandoned cart snapshot (idle / page leave).
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const lines = parsed.data.lines as CartLine[];
  const snapshot = buildAbandonedCartSnapshot(lines);
  if (!snapshot) {
    return Response.json({ ok: true, skipped: true });
  }

  let userId: string | null = null;
  let profileEmail: string | null = null;
  try {
    const { userId: clerkId } = await auth();
    if (clerkId) {
      const profile = await getUserByClerkId(clerkId);
      userId = profile?.id ?? null;
      profileEmail = profile?.email ?? null;
    }
  } catch {
    /* guest checkout path */
  }

  const email =
    parsed.data.email && parsed.data.email.length > 0
      ? parsed.data.email
      : profileEmail;

  const saved = await upsertAbandonedCart({
    userId,
    email,
    phone: parsed.data.phone,
    snapshot,
  });

  if (!saved) {
    return Response.json({ ok: false, error: "Could not save cart" }, { status: 500 });
  }

  return Response.json({ ok: true, recoveryToken: saved.recoveryToken });
}
