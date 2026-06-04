/** معرّفات مساعدي الذكاء الاصطناعي في Cookie Bite */
export const AI_AGENT_IDS = {
  MR_BROWNIE: "mr_brownie",
  /** نفس عقل المتجر — مسار /api/chat (ديمو أو تضمينات) */
  STOREFRONT_CHAT: "storefront_chat",
  MRS_COOKIE: "mrs_cookie",
  PRODUCT_WIZARD: "product_wizard",
} as const;

export type AiAgentId = (typeof AI_AGENT_IDS)[keyof typeof AI_AGENT_IDS];
