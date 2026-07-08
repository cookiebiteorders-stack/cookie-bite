import type { IntegrationEnvStatus } from "@/lib/config/production-lock";
import { INTEGRATION_ENV_GROUPS } from "@/lib/config/production-lock";

export type SettingsIntegrationKey = keyof IntegrationEnvStatus;

export type SettingsIntegrationDef = {
  key: SettingsIntegrationKey;
  labelKey: string;
  required: boolean;
  envKeys: readonly string[];
  adminPath?: string;
};

/** Integrations shown in Settings — status from `getIntegrationEnvStatus`. */
export const SETTINGS_INTEGRATION_DEFS: SettingsIntegrationDef[] = [
  {
    key: "supabase_auth",
    labelKey: "settings.integrations.supabase",
    required: true,
    envKeys: INTEGRATION_ENV_GROUPS.supabase_auth,
    adminPath: "/admin/roles",
  },
  {
    key: "paymob",
    labelKey: "settings.integrations.paymob",
    required: true,
    envKeys: INTEGRATION_ENV_GROUPS.paymob,
  },
  {
    key: "resend",
    labelKey: "settings.integrations.resend",
    required: true,
    envKeys: INTEGRATION_ENV_GROUPS.resend,
    adminPath: "/admin/email/settings",
  },
  {
    key: "internal_api",
    labelKey: "settings.integrations.internalApi",
    required: true,
    envKeys: INTEGRATION_ENV_GROUPS.internal_api,
  },
  {
    key: "app_urls",
    labelKey: "settings.integrations.appUrls",
    required: true,
    envKeys: INTEGRATION_ENV_GROUPS.app_urls,
  },
  {
    key: "cloudinary",
    labelKey: "settings.integrations.cloudinary",
    required: false,
    envKeys: [
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ],
    adminPath: "/admin/media",
  },
  {
    key: "whatsapp",
    labelKey: "settings.integrations.whatsapp",
    required: false,
    envKeys: ["WHATSAPP_CLOUD_API_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  },
  {
    key: "cms_sanity",
    labelKey: "settings.integrations.sanity",
    required: false,
    envKeys: ["NEXT_PUBLIC_SANITY_PROJECT_ID", "NEXT_PUBLIC_SANITY_DATASET"],
    adminPath: "/admin/cms",
  },
  {
    key: "ai_gemini",
    labelKey: "settings.integrations.gemini",
    required: false,
    envKeys: ["GEMINI_API_KEY"],
  },
  {
    key: "redis_queue",
    labelKey: "settings.integrations.redis",
    required: false,
    envKeys: ["REDIS_URL"],
  },
];

export const CORE_HEALTH_CARD_KEYS = [
  "internal_api",
  "supabase_auth",
  "paymob",
  "app_urls",
  "resend",
] as const;

export type CoreHealthCardKey = (typeof CORE_HEALTH_CARD_KEYS)[number];

export const CORE_HEALTH_CARD_DEFS: {
  key: CoreHealthCardKey;
  labelKey: string;
}[] = [
  { key: "internal_api", labelKey: "settings.healthCards.apiGateway" },
  { key: "supabase_auth", labelKey: "settings.healthCards.postgres" },
  { key: "paymob", labelKey: "settings.healthCards.queueWorker" },
  { key: "app_urls", labelKey: "settings.healthCards.cdnEdge" },
  { key: "resend", labelKey: "settings.healthCards.emailService" },
];

export const INTEGRATION_FIX_HINTS: Record<CoreHealthCardKey, string[]> = {
  internal_api: ["INTERNAL_API_SECRET", "REVALIDATE_SECRET"],
  supabase_auth: [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_KEY",
  ],
  paymob: [
    "PAYMOB_API_KEY",
    "PAYMOB_INTEGRATION_ID_CARD",
    "PAYMOB_INTEGRATION_ID_WALLET",
    "PAYMOB_HMAC_SECRET",
  ],
  app_urls: ["NEXT_PUBLIC_APP_URL", "APP_BASE_URL"],
  resend: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
};
