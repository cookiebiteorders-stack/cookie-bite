import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractTemplateVariables } from "@/lib/email/automation/template-renderer";

export type EmailTemplateRecord = {
  id: string;
  key: string;
  name: string;
  subject: string;
  html_body: string;
  variables: string[];
  is_active: boolean;
};

export type EmailEventTemplateMapping = {
  id: string;
  event_name: string;
  template_key: string;
  is_active: boolean;
};

export async function getActiveTemplateByKey(templateKey: string): Promise<EmailTemplateRecord | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("id,key,name,subject,html_body,variables,is_active")
    .eq("key", templateKey)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const storedVariables = Array.isArray(data.variables)
    ? (data.variables.filter((v): v is string => typeof v === "string") as string[])
    : [];
  const discovered = extractTemplateVariables(data.html_body);
  const merged = Array.from(new Set([...storedVariables, ...discovered]));

  return {
    id: data.id as string,
    key: data.key as string,
    name: data.name as string,
    subject: data.subject as string,
    html_body: data.html_body as string,
    variables: merged,
    is_active: Boolean(data.is_active),
  };
}

export async function hasAnyActiveTemplateByKey(templateKey: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("id")
    .eq("key", templateKey)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}

export async function getActiveTemplateForEvent(
  eventName: string,
): Promise<{ mapping: EmailEventTemplateMapping; template: EmailTemplateRecord } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("email_event_template_mappings")
    .select("id,event_name,template_key,is_active")
    .eq("event_name", eventName)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const template = await getActiveTemplateByKey(String(data.template_key));
  if (!template) return null;

  return {
    mapping: {
      id: String(data.id),
      event_name: String(data.event_name),
      template_key: String(data.template_key),
      is_active: Boolean(data.is_active),
    },
    template,
  };
}

export async function writeEmailEventLog(params: {
  eventName: string;
  userId?: string | null;
  email: string;
  templateKey?: string | null;
  templateId?: string | null;
  status: "sent" | "failed" | "skipped";
  emailLogId?: string | null;
  aiUsed?: boolean;
  aiVariables?: Record<string, string>;
  renderedHtmlSnapshot?: string;
  errorMessage?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("email_event_logs").insert({
    event_name: params.eventName,
    user_id: params.userId ?? null,
    recipient: params.email,
    template_key: params.templateKey ?? null,
    template_id: params.templateId ?? null,
    email_log_id: params.emailLogId ?? null,
    status: params.status,
    ai_used: params.aiUsed ?? false,
    ai_variables: params.aiVariables ?? {},
    rendered_html_snapshot: params.renderedHtmlSnapshot ?? null,
    error_message: params.errorMessage ?? null,
  });
  if (error) throw new Error(error.message);
}
