import {
  checkoutDeliverySchema,
  deliveryInputToPersist,
  type CheckoutDeliveryInput,
  type DeliverySchedulingPersist,
} from "@/lib/checkout/delivery-scheduling";
import { assertSlotAvailable, getSlotStartTime } from "@/lib/delivery/slots";

export async function resolveDeliveryForCheckout(
  delivery: unknown,
): Promise<
  | { ok: true; persist: DeliverySchedulingPersist; input: CheckoutDeliveryInput }
  | { ok: false; status: number; error_en: string; error_ar: string }
> {
  const parsed = checkoutDeliverySchema.safeParse(delivery);
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error_en: "Invalid delivery schedule",
      error_ar: "بيانات جدولة التوصيل غير صالحة",
    };
  }

  try {
    await assertSlotAvailable(parsed.data.slot_id, parsed.data.date);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "SLOT_FULL") {
      return {
        ok: false,
        status: 400,
        error_en: "This time slot is full. Pick another.",
        error_ar: "خانة الوقت ممتلئة. اختر خانة أخرى.",
      };
    }
    if (code === "SLOT_NOT_FOUND") {
      return {
        ok: false,
        status: 400,
        error_en: "Time slot not found",
        error_ar: "خانة الوقت غير موجودة",
      };
    }
  }

  const startTime = await getSlotStartTime(parsed.data.slot_id);
  return {
    ok: true,
    input: parsed.data,
    persist: deliveryInputToPersist(parsed.data, startTime),
  };
}
