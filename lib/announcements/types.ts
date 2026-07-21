export type AnnouncementType = "banner" | "popup" | "notification" | "inline" | "system";

export type AnnouncementStatus = "active" | "scheduled" | "expired" | "draft";

export type InlineVariant = "success" | "warning" | "error" | "info";

export type TargetPage =
  | "home"
  | "product"
  | "cart"
  | "shop"
  | "account"
  | "all";

export type AudienceUserType = "all" | "guest" | "logged_in" | "premium" | "staff";

export type TriggerType = "immediate" | "delay" | "scroll" | "exit_intent" | "event";

export type TrackEventType = "impression" | "click" | "dismiss" | "conversion";

export type AnnouncementAudience = {
  userType?: AudienceUserType;
  location?: string | null;
  behavior?: string[];
};

export type AnnouncementTrigger = {
  type: TriggerType;
  value?: number | string;
};

export type AnnouncementFrequency = {
  perSession?: boolean;
  cooldownHours?: number;
  untilInteract?: boolean;
};

export type AnnouncementMetrics = {
  impressions: number;
  clicks: number;
  dismissals: number;
};

export type AnnouncementAbVariant = {
  key: string;
  title_en?: string;
  title_ar?: string;
  message_en?: string;
  message_ar?: string;
  cta_label_en?: string;
  cta_label_ar?: string;
  weight?: number;
  metrics?: AnnouncementMetrics;
};

export type AnnouncementAbTest = {
  enabled: boolean;
  variants: AnnouncementAbVariant[];
};

export type AnnouncementRecord = {
  id: string;
  type: AnnouncementType;
  title_en: string;
  title_ar: string;
  message_en: string;
  message_ar: string;
  cta_label_en: string | null;
  cta_label_ar: string | null;
  cta_url: string | null;
  priority: number;
  status: AnnouncementStatus;
  start_at: string | null;
  end_at: string | null;
  target_pages: TargetPage[];
  audience: AnnouncementAudience;
  trigger_config: AnnouncementTrigger;
  frequency: AnnouncementFrequency;
  dismissible: boolean;
  variant: InlineVariant | null;
  design: Record<string, unknown>;
  ab_test: AnnouncementAbTest | null;
  metrics: AnnouncementMetrics;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type AnnouncementView = {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string;
  cta: { label: string; url: string } | null;
  priority: number;
  dismissible: boolean;
  variant: InlineVariant | null;
  trigger: AnnouncementTrigger;
  frequency: AnnouncementFrequency;
  targetPages: TargetPage[];
  audience: AnnouncementAudience;
  abVariantKey?: string;
};

export type AnnouncementUserContext = {
  isSignedIn: boolean;
  userType: AudienceUserType;
  userName?: string | null;
  loyaltyTier?: string | null;
  behaviors?: string[];
  page: TargetPage;
};

export type AnnouncementCreateInput = Omit<
  AnnouncementRecord,
  "id" | "metrics" | "created_at" | "updated_at" | "created_by"
>;

export type AnnouncementUpdateInput = Partial<AnnouncementCreateInput>;
