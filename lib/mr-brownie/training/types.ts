export type TrainingIntent =
  | "gift_request"
  | "product_browse"
  | "delivery_faq"
  | "cart_help"
  | "order_status"
  | "complaint"
  | "pairing"
  | "budget"
  | "greeting"
  | "general";

export type FewShotExample = {
  intent: TrainingIntent;
  locale: "ar" | "en" | "any";
  user_message: string;
  ideal_response: string;
  bad_response?: string;
  weight: number;
  source: "seed" | "feedback" | "manual" | "correction";
};

export type TrainingTestCase = {
  id: string;
  intent: TrainingIntent;
  user_message: string;
  must_include_any?: string[];
  must_not_include?: string[];
};
