import { APP_URL } from "@/lib/seo/constants";
import type { AbandonedCartRow, AbandonedCartSnapshot } from "@/lib/cart/abandoned";
import { buildRecoveryDiscountCode } from "@/lib/cart/recovery-discount";
import { sendInternalEmail } from "@/lib/email/send";
import { renderTemplate } from "@/lib/notification-library";
import { isEmailConfigured } from "@/lib/email/resend";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const REMINDER_1_MS = 60 * 60 * 1000;
const REMINDER_2_MS = 24 * 60 * 60 * 1000;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemsRowsFromSnapshot(
  snapshot: AbandonedCartSnapshot,
  lang: "en" | "ar" = "ar",
): string {
  const currencySuffix = lang === "ar" ? " جنيه" : " EGP";
  return (snapshot.lines ?? [])
    .map((line) => {
      const total = line.finalUnitPriceEgp * line.quantity;
      return `<tr><td>${escapeHtml(line.name)}</td><td style="text-align:center;">${line.quantity}</td><td style="text-align:end;">${total.toFixed(2)}${currencySuffix}</td></tr>`;
    })
    .join("");
}

async function sendAbandonedCartEmail(
  cart: AbandonedCartRow,
  reminder: 1 | 2,
  discountCode?: string,
): Promise<boolean> {
  if (!cart.email || !isEmailConfigured()) return false;

  const snapshot = cart.cart_snapshot;
  const lang: "en" | "ar" = "ar";
  const recoveryUrl = `${APP_URL.replace(/\/$/, "")}/cart/recover/${cart.recovery_token}`;
  const firstName = cart.email.split("@")[0] ?? "there";
  const offerExpiry = discountCode ? "48 ساعة" : "24 ساعة";

  const rendered = renderTemplate(
    "abandoned-cart",
    {
      first_name: firstName,
      items_rows: itemsRowsFromSnapshot(snapshot, lang),
      cart_total: `${Number(cart.cart_value).toFixed(2)} جنيه`,
      promo_code: discountCode ?? "—",
      discount: discountCode ? 10 : 0,
      offer_expiry: offerExpiry,
      cart_url: recoveryUrl,
      company_address: "التجمع الخامس، القاهرة الجديدة",
      unsubscribe_url: `${APP_URL}/contact`,
      privacy_url: `${APP_URL}/privacy`,
    },
    { lang },
  );

  if (!rendered) {
    console.error("abandoned-cart template missing");
    return false;
  }

  const subject =
    reminder === 1
      ? rendered.subject
      : "خصم 10% علشان تكمّل طلبك من كوكي بايت 🍪";

  try {
    await sendInternalEmail({
      to: cart.email,
      subject,
      html: rendered.html,
    });
    return true;
  } catch (err) {
    console.error("sendAbandonedCartEmail failed", err);
    return false;
  }
}

export async function processAbandonedCartReminders(): Promise<{
  reminder1: number;
  reminder2: number;
  skipped: number;
}> {
  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - REMINDER_1_MS).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - REMINDER_2_MS).toISOString();

  let reminder1 = 0;
  let reminder2 = 0;
  let skipped = 0;

  const { data: firstBatch } = await supabase
    .from("abandoned_carts")
    .select("*")
    .eq("is_recovered", false)
    .is("reminder_1_sent_at", null)
    .lt("created_at", oneHourAgo)
    .gt("cart_value", 0)
    .not("email", "is", null);

  for (const row of (firstBatch ?? []) as AbandonedCartRow[]) {
    const sent = await sendAbandonedCartEmail(row, 1);
    if (!sent) {
      skipped += 1;
      continue;
    }
    await supabase
      .from("abandoned_carts")
      .update({ reminder_1_sent_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", row.id);
    reminder1 += 1;
  }

  const { data: secondBatch } = await supabase
    .from("abandoned_carts")
    .select("*")
    .eq("is_recovered", false)
    .is("reminder_2_sent_at", null)
    .not("reminder_1_sent_at", "is", null)
    .lt("created_at", twentyFourHoursAgo)
    .not("email", "is", null);

  for (const row of (secondBatch ?? []) as AbandonedCartRow[]) {
    const code = buildRecoveryDiscountCode(row.id);
    const { data: existingCode } = await supabase
      .from("recovery_discount_codes")
      .select("id")
      .eq("cart_id", row.id)
      .maybeSingle();

    if (!existingCode) {
      await supabase.from("recovery_discount_codes").insert({
        cart_id: row.id,
        code,
        discount_percent: 10,
      });
    }

    const sent = await sendAbandonedCartEmail(row, 2, code);
    if (!sent) {
      skipped += 1;
      continue;
    }

    await supabase
      .from("abandoned_carts")
      .update({ reminder_2_sent_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", row.id);
    reminder2 += 1;
  }

  return { reminder1, reminder2, skipped };
}
