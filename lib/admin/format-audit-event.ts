/** Localize audit log module/action strings with graceful fallback to raw API values. */

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isMissingTranslation(result: string, fullKey: string) {
  return result === fullKey || result.startsWith(`${fullKey}.`);
}

export function formatAuditModule(
  module: string,
  adminT: (key: string) => string,
) {
  const key = slugify(module);
  if (!key) return module;
  const lookup = `audit.modules.${key}`;
  const translated = adminT(lookup);
  if (isMissingTranslation(translated, `adminAudit.modules.${key}`)) return module;
  return translated;
}

export function formatAuditAction(
  action: string,
  adminT: (key: string) => string,
) {
  const fullKey = slugify(action);
  const actionLookup = `audit.actions.${fullKey}`;
  const exact = adminT(actionLookup);
  if (!isMissingTranslation(exact, `adminAudit.actions.${fullKey}`)) return exact;

  const parts = action.split(".").filter(Boolean);
  if (parts.length >= 2) {
    const mod = formatAuditModule(parts[0], adminT);
    const verbKey = slugify(parts[parts.length - 1]);
    const verbLookup = `audit.verbs.${verbKey}`;
    const verb = adminT(verbLookup);
    if (!isMissingTranslation(verb, `adminAudit.verbs.${verbKey}`)) {
      return `${mod} · ${verb}`;
    }
  }

  return action;
}
