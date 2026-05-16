import type { TemplateVariant } from "./styles";

export type TemplateCategory =
  | "transactional"
  | "lifecycle"
  | "security"
  | "marketing"
  | "retention"
  | "internal-report"
  | "business-report"
  | "dashboard";

export type TemplateMeta = {
  key: string;
  name: string;
  description: string;
  category: TemplateCategory;
  variant: TemplateVariant;
  /** Default sample data used when previewing the template in the admin. */
  sampleVars: Record<string, string | number>;
};

export type RenderedTemplate = {
  key: string;
  subject: string;
  html: string;
  preheader?: string;
};

export type TemplateBuilder = {
  meta: TemplateMeta;
  build: (
    vars: Record<string, string | number | undefined | null>,
    options?: { lang?: "en" | "ar" },
  ) => RenderedTemplate;
};
