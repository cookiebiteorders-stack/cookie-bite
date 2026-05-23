import { z } from "zod";
import type { UserRole } from "@/lib/admin/rbac";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { buildMrBrownieContext } from "@/lib/mr-brownie/build-context";
import { getMrBrownieSystemInstruction } from "@/lib/mr-brownie/system-instruction";
import type { CartLine } from "@/lib/cart/types";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { CHAT_IMAGE_MAX_COUNT, isAllowedChatImageUrl } from "@/lib/chat/image-attachments";
import type { MrBrownieChatMessage } from "@/lib/mr-brownie/gemini";

export const mrBrownieChatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(12000),
        attachments: z
          .array(
            z.object({
              url: z.string().url().max(2000),
              mimeType: z.string().max(80).optional(),
              name: z.string().max(200).optional(),
            }),
          )
          .max(CHAT_IMAGE_MAX_COUNT)
          .optional(),
      }),
    )
    .min(1)
    .max(30),
  cart: z
    .object({
      lines: z
        .array(
          z.object({
            productId: z.string().min(1),
            name: z.string().min(1),
            priceEgp: z.number().nonnegative(),
            quantity: z.number().int().min(1).max(99),
          }),
        )
        .max(50),
    })
    .optional(),
});

export function temperatureForRole(role: UserRole | "guest"): number {
  if (role === "guest" || role === "customer") return 0.7;
  if (role === "staff") return 0.25;
  return 0.2;
}

export function maxTokensForRole(role: UserRole | "guest"): number {
  if (role === "guest" || role === "customer") return 1500;
  return 3000;
}

export type MrBrowniePreparedChat = {
  resolvedRole: UserRole | "guest";
  rawMessages: MrBrownieChatMessage[];
  systemInstruction: string;
  temperature: number;
  maxOutputTokens: number;
};

export async function prepareMrBrownieChat(params: {
  messages: z.infer<typeof mrBrownieChatBodySchema>["messages"];
  cartLines: CartLine[];
  userId: string | null;
  clerkUser: {
    primaryEmailAddress?: { emailAddress?: string | null } | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  } | null;
}): Promise<MrBrowniePreparedChat> {
  let resolvedRole: UserRole | "guest" = "guest";
  let email: string | null = null;
  let name: string | null = null;
  let dbUserId: string | null = null;
  let loyaltyTier: string | null = null;
  let pastOrdersHint = "";

  if (params.userId) {
    email = params.clerkUser?.primaryEmailAddress?.emailAddress ?? null;
    name = params.clerkUser
      ? [params.clerkUser.firstName, params.clerkUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        params.clerkUser.username ||
        email
      : null;

    resolvedRole = await resolveStaffRole({
      email,
      clerkUserId: params.userId,
    });

    const supabase = tryCreateSupabaseAdminClient();
    if (supabase) {
      const { data: row } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_user_id", params.userId)
        .maybeSingle();
      if (row?.id) dbUserId = row.id as string;

      if (dbUserId) {
        const { data: loyalty } = await supabase
          .from("loyalty_accounts")
          .select("tier")
          .eq("user_id", dbUserId)
          .maybeSingle();
        if (loyalty?.tier) loyaltyTier = String(loyalty.tier);

        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", dbUserId);
        if (typeof count === "number") {
          pastOrdersHint = `${count} order(s) on record in Cookie Bite.`;
        }
      }
    }
  }

  const includeAdminData =
    resolvedRole === "owner" ||
    resolvedRole === "admin" ||
    resolvedRole === "staff";

  const contextPayload = await buildMrBrownieContext({
    role: resolvedRole,
    userId: dbUserId ?? params.userId,
    email,
    name,
    loyaltyTier,
    pastOrdersHint,
    cartLines: params.cartLines,
    includeAdminData,
  });

  const contextJson = JSON.stringify(contextPayload);
  const systemInstruction = getMrBrownieSystemInstruction(resolvedRole);

  const rawMessages: MrBrownieChatMessage[] = params.messages.map((m, i, arr) => {
    const attachments = m.attachments?.filter((a) => isAllowedChatImageUrl(a.url));
    if (i !== arr.length - 1 || m.role !== "user") {
      return {
        role: m.role,
        content: m.content,
        attachments: attachments?.length ? attachments : undefined,
      };
    }
    return {
      role: "user" as const,
      content: `CONTEXT (JSON — authoritative role & data):\n${contextJson}\n\nUSER MESSAGE:\n${m.content}`,
      attachments: attachments?.length ? attachments : undefined,
    };
  });

  return {
    resolvedRole,
    rawMessages,
    systemInstruction,
    temperature: temperatureForRole(resolvedRole),
    maxOutputTokens: maxTokensForRole(resolvedRole),
  };
}
