export type TemplateVariableValue = string | number | boolean | null | undefined;

export function extractTemplateVariables(html: string): string[] {
  const vars = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(html)) !== null) {
    vars.add(match[1] ?? "");
  }
  return Array.from(vars).filter(Boolean);
}

export function renderTemplateContent(
  html: string,
  values: Record<string, TemplateVariableValue>,
): string {
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, key: string) => {
    const value = values[key];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}
