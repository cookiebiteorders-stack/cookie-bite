import { z } from "zod";

const egyptPhone = z
  .string()
  .regex(/^01[0125][0-9]{8}$/, { message: "Invalid Egyptian phone" });

export const recipientAddressSchema = z.object({
  street: z.string().min(2).max(200),
  district: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
});

export const checkoutDeliverySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    slot_id: z.string().max(80).optional().or(z.literal("")),
    slot_label: z.string().max(120).optional(),
    is_gift: z.boolean().default(false),
    hide_price: z.boolean().default(false),
    anonymous_sender: z.boolean().default(false),
    sender_name: z.string().max(100).optional(),
    gift_message: z.string().max(500).optional(),
    recipient_name: z.string().max(100).optional(),
    recipient_phone: egyptPhone.optional(),
    recipient_address: recipientAddressSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.is_gift) return;
    if (!data.recipient_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipient name required",
        path: ["recipient_name"],
      });
    }
    if (!data.recipient_phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipient phone required",
        path: ["recipient_phone"],
      });
    }
    if (!data.recipient_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Recipient address required",
        path: ["recipient_address"],
      });
    }
    if (!data.anonymous_sender && !data.sender_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sender name required",
        path: ["sender_name"],
      });
    }
  });

export type CheckoutDeliveryInput = z.infer<typeof checkoutDeliverySchema>;

export type DeliverySchedulingState = {
  deliveryDate: string;
  slotId: string;
  slotLabel: string;
  isGift: boolean;
  hidePrice: boolean;
  anonymousSender: boolean;
  senderName: string;
  giftMessage: string;
  recipientName: string;
  recipientPhone: string;
  recipientStreet: string;
  recipientDistrict: string;
  recipientCity: string;
};

export function emptyDeliveryScheduling(): DeliverySchedulingState {
  return {
    deliveryDate: "",
    slotId: "",
    slotLabel: "",
    isGift: false,
    hidePrice: false,
    anonymousSender: false,
    senderName: "",
    giftMessage: "",
    recipientName: "",
    recipientPhone: "",
    recipientStreet: "",
    recipientDistrict: "",
    recipientCity: "New Cairo",
  };
}

export function validateDeliverySchedulingClient(
  state: DeliverySchedulingState,
  lang: "en" | "ar",
): string | null {
  const parsed = checkoutDeliverySchema.safeParse(stateToPayload(state));
  if (parsed.success) return null;
  const first = parsed.error.issues[0];
  if (!first) {
    return lang === "ar" ? "بيانات التوصيل غير صالحة" : "Invalid delivery details";
  }
  if (first.path[0] === "date" || first.path[0] === "slot_id") {
    return lang === "ar"
      ? "اختر تاريخ التوصيل وخانة الوقت"
      : "Choose a delivery date and time slot";
  }
  if (state.isGift && first.path.includes("recipient_name")) {
    return lang === "ar" ? "اسم المستلم مطلوب" : "Recipient name is required";
  }
  if (state.isGift && first.path.includes("recipient_phone")) {
    return lang === "ar" ? "جوال المستلم غير صالح" : "Valid recipient phone is required";
  }
  if (state.isGift && first.path.includes("recipient_address")) {
    return lang === "ar" ? "عنوان المستلم مطلوب" : "Recipient address is required";
  }
  if (state.isGift && first.path.includes("sender_name")) {
    return lang === "ar" ? "اسم المرسل على البطاقة مطلوب" : "Sender name on card is required";
  }
  return lang === "ar" ? "تحقق من بيانات التوصيل" : "Please check delivery details";
}

export function stateToPayload(state: DeliverySchedulingState): CheckoutDeliveryInput {
  return {
    date: state.deliveryDate,
    slot_id: state.slotId,
    slot_label: state.slotLabel || undefined,
    is_gift: state.isGift,
    hide_price: state.hidePrice,
    anonymous_sender: state.anonymousSender,
    sender_name: state.anonymousSender ? undefined : state.senderName.trim() || undefined,
    gift_message: state.giftMessage.trim() || undefined,
    recipient_name: state.isGift ? state.recipientName.trim() : undefined,
    recipient_phone: state.isGift ? state.recipientPhone.trim() : undefined,
    recipient_address: state.isGift
      ? {
          street: state.recipientStreet.trim(),
          district: state.recipientDistrict.trim(),
          city: state.recipientCity.trim(),
        }
      : undefined,
  };
}

export type DeliverySchedulingPersist = {
  scheduledDeliveryDate: string;
  scheduledDeliveryTime: string | null;
  deliverySlotId: string;
  deliverySlotLabel: string | null;
  isGift: boolean;
  hidePrice: boolean;
  anonymousSender: boolean;
  senderName: string | null;
  giftMessage: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientAddress: Record<string, string> | null;
};

export function deliveryInputToPersist(
  input: CheckoutDeliveryInput,
  slotStartTime: string | null,
): DeliverySchedulingPersist {
  return {
    scheduledDeliveryDate: input.date ?? "",
    scheduledDeliveryTime: slotStartTime,
    deliverySlotId: input.slot_id ?? "",
    deliverySlotLabel: input.slot_label ?? null,
    isGift: input.is_gift,
    hidePrice: input.hide_price,
    anonymousSender: input.anonymous_sender,
    senderName: input.anonymous_sender ? null : input.sender_name ?? null,
    giftMessage: input.gift_message ?? null,
    recipientName: input.recipient_name ?? null,
    recipientPhone: input.recipient_phone ?? null,
    recipientAddress: input.recipient_address ?? null,
  };
}
