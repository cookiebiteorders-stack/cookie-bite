import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listDeliverySlotsForDate } from "@/lib/delivery/slots";
import { bilingualError } from "@/lib/validations";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid date", "تاريخ غير صالح"), { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requested = new Date(parsed.data.date + "T12:00:00");
  if (Number.isNaN(requested.getTime())) {
    return NextResponse.json(bilingualError("Invalid date", "تاريخ غير صالح"), { status: 400 });
  }
  if (requested < today) {
    return NextResponse.json(bilingualError("Date is in the past", "التاريخ في الماضي"), {
      status: 400,
    });
  }

  const max = new Date(today);
  max.setDate(max.getDate() + 30);
  if (requested > max) {
    return NextResponse.json(
      bilingualError("Date too far ahead", "التاريخ بعيد جداً (حد أقصى 30 يوماً)"),
      { status: 400 },
    );
  }

  const { slots, day_of_week } = await listDeliverySlotsForDate(parsed.data.date);
  return NextResponse.json({ slots, day_of_week, date: parsed.data.date });
}
