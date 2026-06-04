import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bilingualError } from "@/lib/validations";

const addressLineSchema = z.object({
  recipient: z.string().min(1).max(120),
  phone: z.string().min(8).max(24),
  address: z.string().min(5).max(400),
  notes: z.string().max(200).optional(),
});

const schema = z.object({
  company_name: z.string().min(2).max(200),
  contact_name: z.string().max(120).optional(),
  contact_email: z.string().email(),
  contact_phone: z.string().max(24).optional(),
  notes: z.string().max(1000).optional(),
  addresses: z.array(addressLineSchema).min(1).max(200),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      bilingualError("Invalid payload", "بيانات غير صالحة — تحقق من العناوين"),
      { status: 400 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("corporate_bulk_requests").insert({
    company_name: parsed.data.company_name,
    contact_name: parsed.data.contact_name ?? null,
    contact_email: parsed.data.contact_email,
    contact_phone: parsed.data.contact_phone ?? null,
    notes: parsed.data.notes ?? null,
    addresses: parsed.data.addresses,
  });

  if (error) {
    console.error("corporate_bulk_requests insert", error);
    return NextResponse.json(
      bilingualError("Failed to submit request", "فشل إرسال الطلب"),
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message_en: "Request received. Our team will contact you within 1–2 business days.",
    message_ar: "استلمنا طلبك. فريقنا سيتواصل معك خلال 1–2 يوم عمل.",
  });
}
