import { TRANSACTIONAL_TEMPLATES } from "./templates/transactional";
import { SECURITY_TEMPLATES } from "./templates/security";
import { LIFECYCLE_TEMPLATES } from "./templates/lifecycle";
import { MARKETING_TEMPLATES } from "./templates/marketing";
import { RETENTION_TEMPLATES } from "./templates/retention";
import { INTERNAL_REPORT_TEMPLATES } from "./templates/internal-reports";
import { BUSINESS_REPORT_TEMPLATES } from "./templates/business-reports";
import type {
  RenderedTemplate,
  TemplateBuilder,
  TemplateCategory,
  TemplateMeta,
} from "./types";

const ALL: TemplateBuilder[] = [
  ...TRANSACTIONAL_TEMPLATES,
  ...LIFECYCLE_TEMPLATES,
  ...SECURITY_TEMPLATES,
  ...MARKETING_TEMPLATES,
  ...RETENTION_TEMPLATES,
  ...INTERNAL_REPORT_TEMPLATES,
  ...BUSINESS_REPORT_TEMPLATES,
];

const BY_KEY = new Map<string, TemplateBuilder>(ALL.map((b) => [b.meta.key, b]));

export function listTemplates(): TemplateMeta[] {
  return ALL.map((b) => b.meta);
}

export function groupTemplatesByCategory(): Array<{
  category: TemplateCategory;
  label: string;
  items: TemplateMeta[];
}> {
  const labels: Record<TemplateCategory, string> = {
    transactional: "Transactional",
    lifecycle: "Order Lifecycle",
    security: "Account & Security",
    marketing: "Marketing",
    retention: "Retention & Growth",
    "internal-report": "Internal Reports (email)",
    "business-report": "Business Reports (printable)",
    dashboard: "Dashboards",
  };
  const order: TemplateCategory[] = [
    "transactional",
    "lifecycle",
    "security",
    "marketing",
    "retention",
    "internal-report",
    "business-report",
  ];
  return order
    .map((category) => ({
      category,
      label: labels[category],
      items: ALL.filter((b) => b.meta.category === category).map((b) => b.meta),
    }))
    .filter((g) => g.items.length > 0);
}

export function getTemplate(key: string): TemplateBuilder | undefined {
  return BY_KEY.get(key);
}

export function renderTemplate(
  key: string,
  vars: Record<string, string | number | undefined | null> = {},
  options?: { lang?: "en" | "ar" },
): RenderedTemplate | undefined {
  const builder = BY_KEY.get(key);
  if (!builder) return undefined;
  return builder.build(vars, options);
}
