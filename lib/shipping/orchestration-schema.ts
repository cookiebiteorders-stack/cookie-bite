import { z } from "zod";

/** نموذج نموذج الواجهة — يُحوَّل إلى حمولة API قبل الإرسال */
export const zoneFormSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(120),
    cities: z.array(z.string().min(1)).min(1, "Add at least one city"),
    base_fee_display: z.coerce.number().min(0, "Must be 0 or greater"),
    currency: z.enum(["EGP", "USD"]),
    free_shipping_enabled: z.boolean(),
    /** نفس عملة base_fee_display — يُحوَّل للجنيه عند الإرسال */
    free_shipping_threshold_display: z.coerce.number().min(0).nullable(),
    eta_min_days: z.coerce.number().int().min(0),
    eta_max_days: z.coerce.number().int().min(0),
    is_active: z.boolean(),
  })
  .refine((d) => d.eta_max_days >= d.eta_min_days, {
    message: "Max days must be greater than or equal to min days",
    path: ["eta_max_days"],
  })
  .refine(
    (d) =>
      !d.free_shipping_enabled ||
      (d.free_shipping_threshold_display != null && d.free_shipping_threshold_display >= 0),
    { message: "Enter a free-shipping threshold", path: ["free_shipping_threshold_display"] },
  );

export type ZoneFormValues = z.infer<typeof zoneFormSchema>;

export const defaultZoneFormValues: ZoneFormValues = {
  name: "",
  cities: [],
  base_fee_display: 0,
  currency: "EGP",
  free_shipping_enabled: false,
  free_shipping_threshold_display: null,
  eta_min_days: 1,
  eta_max_days: 3,
  is_active: true,
};
