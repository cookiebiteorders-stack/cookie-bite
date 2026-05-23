import chatbotConfig from "@/config/chatbot.config.json";

export type ChatbotConfig = typeof chatbotConfig;

export const CHATBOT_CONFIG: ChatbotConfig = chatbotConfig;

export function getChatbotConfig(): ChatbotConfig {
  return CHATBOT_CONFIG;
}
