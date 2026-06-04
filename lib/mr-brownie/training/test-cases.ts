import type { TrainingTestCase } from "@/lib/mr-brownie/training/types";

/** حالات QA — للتحقق من اكتشاف النية ووجود أمثلة few-shot مناسبة */
export const MR_BROWNIE_TRAINING_TEST_CASES: TrainingTestCase[] = [
  {
    id: "gift-ar",
    intent: "gift_request",
    user_message: "أريد هدية لصديقة",
    must_include_any: ["مناسبة", "صندوق", "؟", "/gift"],
  },
  {
    id: "gift-box-ar",
    intent: "gift_request",
    user_message: "أريد صندوق هدية",
    must_include_any: ["مناسبة", "ميزانية", "؟", "/gift"],
  },
  {
    id: "delivery-ar",
    intent: "delivery_faq",
    user_message: "التوصيل بكام",
    must_include_any: ["توصيل", "شحن", "/help"],
  },
  {
    id: "order-ar",
    intent: "order_status",
    user_message: "أين طلبي",
    must_include_any: ["/account", "/track", "طلب"],
  },
  {
    id: "complaint-ar",
    intent: "complaint",
    user_message: "الطلب وصل بايظ",
    must_include_any: ["آسف", "صورة", "/help"],
  },
];
