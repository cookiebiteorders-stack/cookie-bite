import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import type { UserRole } from "@/lib/admin/rbac";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { buildMrBrownieContext } from "@/lib/mr-brownie/build-context";
import { runMrBrownieGemini } from "@/lib/mr-brownie/gemini";
import { getMrBrownieSystemInstruction } from "@/lib/mr-brownie/system-instruction";
import type { CartLine } from "@/lib/cart/types";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { CHAT_IMAGE_MAX_COUNT, isAllowedChatImageUrl } from "@/lib/chat/image-attachments";

const attachmentSchema = z.object({
  url: z.string().url().max(2000),
  mimeType: z.string().max(80).optional(),
  name: z.string().max(200).optional(),
});

const cartLineSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  priceEgp: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99),
});

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(12000),
        attachments: z.array(attachmentSchema).max(CHAT_IMAGE_MAX_COUNT).optional(),
      }),
    )
    .min(1)
    .max(30),
  cart: z
    .object({
      lines: z.array(cartLineSchema).max(50),
    })
    .optional(),
});

function temperatureForRole(role: UserRole | "guest"): number {
  if (role === "guest" || role === "customer") return 0.7;
  if (role === "staff") return 0.25;
  return 0.2;
}

function maxTokensForRole(role: UserRole | "guest"): number {
  if (role === "guest" || role === "customer") return 1500;
  return 3000;
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: { en: "Invalid payload", ar: "بيانات غير صالحة" } },
        { status: 400 },
      );
    }

    const msgList = parsed.data.messages;
    if (msgList[0]?.role !== "user") {
      return NextResponse.json(
        {
          error: {
            en: "Conversation must start with a user message.",
            ar: "يجب أن تبدأ المحادثة برسالة من المستخدم.",
          },
        },
        { status: 400 },
      );
    }

    const { userId } = await auth();

    let clerkUser: Awaited<ReturnType<typeof currentUser>> = null;
    if (userId) {
      try {
        clerkUser = await currentUser();
      } catch (e) {
        console.error("[mr-brownie/chat] currentUser failed:", e);
      }
    }

    let resolvedRole: UserRole | "guest" = "guest";
    let email: string | null = null;
    let name: string | null = null;
    let dbUserId: string | null = null;
    let loyaltyTier: string | null = null;
    let pastOrdersHint = "";

    if (userId) {
      email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
      name = clerkUser
        ? [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
          clerkUser.username ||
          email
        : null;

      resolvedRole = await resolveStaffRole({
        email,
        clerkUserId: userId,
      });

      const supabase = tryCreateSupabaseAdminClient();
      if (supabase) {
        const { data: row } = await supabase
          .from("users")
          .select("id")
          .eq("clerk_user_id", userId)
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

    const cartLines = (parsed.data.cart?.lines ?? []) as CartLine[];

    const contextPayload = await buildMrBrownieContext({
      role: resolvedRole,
      userId: dbUserId ?? userId,
      email,
      name,
      loyaltyTier,
      pastOrdersHint,
      cartLines,
      includeAdminData,
    });

    const contextJson = JSON.stringify(contextPayload);
    const systemInstruction = getMrBrownieSystemInstruction(resolvedRole);

    const rawMessages = parsed.data.messages.map((m, i, arr) => {
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

    let reply = "";
    let usedModel = process.env.MR_BROWNIE_GEMINI_MODEL?.trim() || "gemini-flash-latest";

    try {
      reply = await runMrBrownieGemini({
        systemInstruction,
        messages: rawMessages,
        temperature: temperatureForRole(resolvedRole),
        maxOutputTokens: maxTokensForRole(resolvedRole),
      });
    } catch (e) {
      console.error("Gemini API Error, falling back to local responses:", e);
      usedModel = "fallback-local-rules";
      
      const lastUserMsg = msgList[msgList.length - 1]?.content.toLowerCase() || "";
      
      // Fallback Keyword Logic
      if (lastUserMsg.includes("مرحبا") || lastUserMsg.includes("هلا") || lastUserMsg.includes("سلام")) {
        reply = "مرحباً بك! أنا مستر براوني 🐻، كيف يمكنني مساعدتك في طلب الكوكيز اليوم؟";
      } else if (lastUserMsg.includes("توصيل") || lastUserMsg.includes("شحن") || lastUserMsg.includes("متى")) {
        reply = "🚚 التوصيل مجاني للطلبات فوق 500 جنيه! وتصلك الكوكيز طازجة خلال 24-48 ساعة داخل القاهرة والجيزة.";
      } else if (lastUserMsg.includes("هدية") || lastUserMsg.includes("هدايا") || lastUserMsg.includes("مناسبة")) {
        reply = "🎁 للهدايا، أنصحك جداً بـ 'صندوق هدايا مستر براوني' المكون من 12 قطعة كوكيز مشكلة! تغليف فاخر ومثالي لأي مناسبة. هل أضيفه لك في السلة؟";
      } else if (lastUserMsg.includes("قهوة") || lastUserMsg.includes("كوفي") || lastUserMsg.includes("مشروب")) {
        reply = "☕ أفضل كوكيز مع القهوة هي 'كلاسيك تشوكليت شيب' أو 'دبل دارك تشوكليت'! حلاوتها موزونة وتذوب مع القهوة الساخنة.";
      } else if (lastUserMsg.includes("أكثر طلبا") || lastUserMsg.includes("مشهور") || lastUserMsg.includes("اكثر") || lastUserMsg.includes("وين")) {
        reply = "🍪 الأكثر طلباً لدينا هو 'تشانكي نيو يورك' و 'بستاشيو براوني'. لا يفوتك تجربتها!";
      } else if (lastUserMsg.includes("سعر") || lastUserMsg.includes("بكم") || lastUserMsg.includes("اسعار")) {
        reply = "💰 تبدأ أسعار الكوكيز من 65 جنيه للقطعة، وتوجد خصومات رائعة على علب الـ 6 والـ 12 قطعة! تفقد صفحة المتجر لمعرفة كل التفاصيل.";
      } else if (resolvedRole === "staff" || resolvedRole === "admin" || resolvedRole === "owner") {
        if (lastUserMsg.includes("طلبات") || lastUserMsg.includes("ملخص")) {
          reply = "📊 (وضع الاستجابة التلقائية): يرجى مراجعة لوحة تحكم الطلبات للحصول على أحدث الإحصائيات الدقيقة، حيث أن الاتصال بالذكاء الاصطناعي غير متاح حالياً.";
        } else {
          reply = `مرحباً بك في وضع الإدارة (${resolvedRole}). عذراً، تعذر الاتصال بـ Gemini API حالياً للقيام بالتحليلات المتقدمة. يرجى مراجعة البيانات من لوحة التحكم مباشرة.`;
        }
      } else {
        reply = "عذراً، أواجه مشكلة مؤقتة في الاتصال بخوادم الذكاء الاصطناعي (Gemini) 🤖، لكني هنا دائماً لمساعدتك! جرب سؤالي عن التوصيل، الهدايا، أو الكوكيز المناسبة مع القهوة.";
      }
    }

    return NextResponse.json({
      reply,
      meta: {
        role: resolvedRole,
        model: usedModel,
      },
    });
  } catch (e) {
    console.error("mr-brownie chat top-level error", e);
    return NextResponse.json(
      {
        error: {
          en: "Could not complete the reply.",
          ar: "تعذر إكمال الرد.",
        },
      },
      { status: 500 },
    );
  }
}
