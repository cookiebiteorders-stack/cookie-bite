import { sendAutomatedEmailNow } from "@/lib/email/automation/pipeline";
import { fillMissingTemplateVariablesWithAi } from "@/lib/email/automation/ai-variable-fill";
import {
  getActiveTemplateForEvent,
  writeEmailEventLog,
} from "@/lib/email/automation/template-repository";
import { renderTemplateContent } from "@/lib/email/automation/template-renderer";
import { getEmailLogIdByQueueId } from "@/lib/email/automation/db";
import { mergeAutomationTemplateVars } from "@/lib/email/automation/merge-template-vars";

export type EmailAutomationEvent =
  | "user_registered"
  | "order_created"
  | "order_shipped"
  | "password_reset";

type TriggerParams = {
  eventName: EmailAutomationEvent | string;
  to: string;
  userId?: string | null;
  providedData: Record<string, unknown>;
  userData?: Record<string, unknown>;
};

export async function triggerEmailAutomationEvent(params: TriggerParams): Promise<{
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  queueId?: string;
  messageId?: string;
  aiUsed?: boolean;
  aiVariables?: Record<string, string>;
}> {
  const mapped = await getActiveTemplateForEvent(params.eventName);
  if (!mapped) {
    await writeEmailEventLog({
      eventName: params.eventName,
      userId: params.userId ?? null,
      email: params.to,
      status: "skipped",
      errorMessage: "template_mapping_or_template_not_found",
    });
    return { ok: false, skipped: true, reason: "template_mapping_or_template_not_found" };
  }

  const { template } = mapped;
  if (!template.is_active) {
    await writeEmailEventLog({
      eventName: params.eventName,
      userId: params.userId ?? null,
      email: params.to,
      templateId: template.id,
      templateKey: template.key,
      status: "skipped",
      errorMessage: "template_inactive",
    });
    return { ok: false, skipped: true, reason: "template_inactive" };
  }

  const { merged: mergedVariables, missingForAi } = await mergeAutomationTemplateVars({
    to: params.to,
    templateKey: template.key,
    templateVariables: template.variables,
    providedData: params.providedData,
  });

  let aiVariables: Record<string, string> = {};
  if (missingForAi.length) {
    try {
      aiVariables = await fillMissingTemplateVariablesWithAi({
        templateName: template.key,
        templateVariables: missingForAi,
        providedData: { ...params.providedData, ...mergedVariables },
        userData: params.userData,
        context: params.eventName,
      });
    } catch (error) {
      console.error("[email-automation] AI fill failed:", error);
    }
  }

  const finalVariables: Record<string, string | number | boolean | null | undefined> = {
    ...mergedVariables,
    ...aiVariables,
  };
  const renderedHtml = renderTemplateContent(template.html_body, finalVariables);
  const renderedSubject = renderTemplateContent(template.subject, finalVariables);

  const sendResult = await sendAutomatedEmailNow({
    to: params.to,
    subject: renderedSubject,
    html: renderedHtml,
    templateKey: template.key,
    emailType: "transactional",
    userId: params.userId ?? undefined,
    variables: finalVariables,
    immediate: true,
    metadata: {
      eventName: params.eventName,
      aiUsed: Object.keys(aiVariables).length > 0,
      aiVariables,
      templateId: template.id,
    },
  });

  const status = sendResult.ok ? "sent" : "failed";
  const emailLogId = sendResult.queueId ? await getEmailLogIdByQueueId(sendResult.queueId) : null;
  await writeEmailEventLog({
    eventName: params.eventName,
    userId: params.userId ?? null,
    email: params.to,
    templateId: template.id,
    templateKey: template.key,
    status,
    emailLogId,
    aiUsed: Object.keys(aiVariables).length > 0,
    aiVariables,
    renderedHtmlSnapshot: renderedHtml.slice(0, 20000),
    errorMessage: sendResult.error ?? null,
  });

  return {
    ok: sendResult.ok,
    queueId: sendResult.queueId,
    messageId: sendResult.messageId,
    reason: sendResult.error,
    aiUsed: Object.keys(aiVariables).length > 0,
    aiVariables,
  };
}
