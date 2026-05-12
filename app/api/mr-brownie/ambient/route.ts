import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { BRAND } from "@/lib/brand";
import { ALL_SELLABLE } from "@/lib/data";

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

    const topProducts = ALL_SELLABLE.map((p) => p.name?.trim()).filter(
      (n): n is string => Boolean(n && n.length > 0),
    );
    const namePool =
      topProducts.length > 0
        ? topProducts.slice(0, 6)
        : (["كوكيز الكلاسيك", "صندوق الهدايا", "البراونيز", "كوكيز محشوة"] as const);
    const pickName = () => pick(namePool);
    const freeShipThreshold = BRAND.freeDeliveryThresholdEgp;
    const amountLeft = Math.max(0, freeShipThreshold - cartSubtotal);

    const roleLine =
      resolvedRole === "owner" || resolvedRole === "admin"
        ? "📊 تحب ملخص سريع للأداء اليومي من لوحة الإدارة؟"
        : resolvedRole === "staff"
          ? "🧾 جاهز أساعدك بخطوات تجهيز الطلبات بسرعة."
          : "🤖 أنا موجود لو محتاج ترشيح سريع أو مساعدة في الاختيار.";

    const cartLine =
      cartItems > 0
        ? amountLeft > 0
          ? `🚚 فاضل ${Math.round(amountLeft)} جنيه للوصول للشحن المجاني.`
          : "🎉 وصلت للشحن المجاني! تقدر تكمل الطلب الآن."
        : "🛍️ تقدر تبدأ بسؤال: إيه أفضل كوكيز للهدايا؟";

    const dynamicChoices = [
      `🔥 الأكثر شهرة الآن: ${pickName()} و ${pickName()}.`,
      `🎁 لو بتدور على هدية: جرب ${pickName()}.`,
      `☕ مع القهوة غالبًا الناس بتحب ${pickName()}.`,
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

