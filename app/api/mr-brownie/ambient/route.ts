import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getAiProductNamePool } from "@/lib/ai/website-knowledge";
import { BRAND } from "@/lib/brand";

const bodySchema = z.object({
  cartItems: z.number().int().min(0).max(200).optional(),
  cartSubtotalEgp: z.number().min(0).max(1_000_000).optional(),
});

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    const cartItems = parsed.success ? (parsed.data.cartItems ?? 0) : 0;
    const cartSubtotal = parsed.success ? (parsed.data.cartSubtotalEgp ?? 0) : 0;

    const { userId } = await auth();

    /** `currentUser()` hits Clerk over the network — skip for guests; on failure use Supabase + userId only */
    let clerkEmail: string | null = null;
    if (userId) {
      try {
        const clerkUser = await currentUser();
        clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
      } catch (e) {
        console.error("[mr-brownie/ambient] currentUser failed:", e);
      }
    }

    const resolvedRole = userId
      ? await resolveStaffRole({
          email: clerkEmail,
          clerkUserId: userId,
        })
      : "guest";

    const liveNames = await getAiProductNamePool(8);
    const namePool =
      liveNames.length > 0
        ? liveNames.slice(0, 6)
        : (["كوكيز الكلاسيك", "صندوق الهدايا", "البراونيز", "كوكيز محشية"] as const);
    const pickName = () => pick(namePool);
    const freeShipThreshold = BRAND.freeDeliveryThresholdEgp;
    const amountLeft = Math.max(0, freeShipThreshold - cartSubtotal);

    const roleLine =
      resolvedRole === "owner" || resolvedRole === "admin"
        ? "📊 هل تريد ملخصاً سريعاً للأداء اليومي من لوحة الإدارة؟"
        : resolvedRole === "staff"
          ? "🧾 جاهز لمساعدتك في خطوات تجهيز الطلبات."
          : "🤖 أنا هنا لاقتراح منتج أو مساعدتك في الاختيار.";

    const cartLine =
      cartItems > 0
        ? amountLeft > 0
          ? `🚚 تبقّى ${Math.round(amountLeft)} جنيه للوصول إلى الشحن المجاني.`
          : "🎉 وصلت إلى حد الشحن المجاني — يمكنك إتمام الطلب الآن."
        : "🛍️ اسألني عن أفضل كوكيز للهدايا أو حسب ذوقك.";

    const dynamicChoices = [
      `🔥 من الأكثر طلباً الآن: ${pickName()} و ${pickName()}.`,
      `🎁 إن كنت تبحث عن هدية: جرّب ${pickName()}.`,
      `☕ مع القهوة يناسب غالباً ${pickName()}.`,
      roleLine,
      cartLine,
    ];

    return NextResponse.json({
      message: pick(dynamicChoices),
      meta: { role: resolvedRole },
    });
  } catch (error) {
    console.error("ambient-message error", error);
    return NextResponse.json(
      { error: { en: "Could not generate ambient message.", ar: "تعذر إنشاء رسالة حالية." } },
      { status: 500 },
    );
  }
}
