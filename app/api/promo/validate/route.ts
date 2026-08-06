import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { promoCodeSchema, bilingualError } from "@/lib/validations";
import { logStructuredError } from "@/lib/logger";
import {
  fetchActivePromoByCode,
  validatePromoForCart,
} from "@/lib/promo/validate-promo";
import {
  fetchRecoveryDiscountByCode,
  validateRecoveryDiscountForCart,
} from "@/lib/cart/recovery-discount";

// SEC-03: Simple in-memory rate limiter for promo validation
// Limits to 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    // Reset or create new record
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export async function POST(req: NextRequest) {
  // SEC-03: Rate limiting
  const ip = req.headers.get("x-forwarded-for") || 
             req.headers.get("x-real-ip") || 
             "unknown";
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        valid: false,
        ...bilingualError("Too many requests", "طلبات كثيرة جداً"),
      },
      { status: 429 },
    );
  }
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json(
      { valid: false, ...bilingualError("Invalid JSON", "صيغة غير صالحة") },
      { status: 400 },
    );
  }

  const parsed = promoCodeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        valid: false,
        ...bilingualError("Invalid request", "طلب غير صالح"),
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { code, cart_total } = parsed.data;
  const supabase = createSupabaseAdminClient();

  let promo;
  try {
    promo = await fetchActivePromoByCode(supabase, code);
  } catch (error) {
    logStructuredError("/api/promo/validate", error, { code: code.toUpperCase() });
    return NextResponse.json(
      {
        valid: false,
        ...bilingualError("Server error", "خطأ في الخادم"),
      },
      { status: 500 },
    );
  }

  let result = validatePromoForCart(promo, cart_total);
  if (!result.valid) {
    try {
      const recovery = await fetchRecoveryDiscountByCode(supabase, code);
      result = validateRecoveryDiscountForCart(recovery, cart_total);
    } catch (error) {
      logStructuredError("/api/promo/validate recovery", error, { code: code.toUpperCase() });
    }
  }
  if (!result.valid) {
    return NextResponse.json({
      valid: false,
      ...bilingualError(result.error_en, result.error_ar),
    });
  }

  return NextResponse.json({
    valid: true,
    discount_amount: result.discount_amount,
    type: result.promo.type,
    value: result.promo.value,
    code: result.promo.code,
  });
}
