/**
 * تحضير سياق المتجر الكامل (عقل Mr. Brownie) — يُستخدم من
 * /api/mr-brownie/* و /api/chat
 */
export {
  prepareMrBrownieChat as prepareStorefrontAgentChat,
  mrBrownieChatBodySchema as storefrontAgentBodySchema,
  temperatureForRole,
  maxTokensForRole,
  type MrBrowniePreparedChat as StorefrontAgentPreparedChat,
} from "@/lib/mr-brownie/prepare-chat";
