import type { MasterToolMeta } from "@/lib/admin/copilot/tool-registry";

/** Returns true when the tool should not hit the database yet. */
export function shouldPreview(
  args: Record<string, unknown>,
  meta: MasterToolMeta | undefined,
): boolean {
  if (args.confirm === true || args.execute === true) return false;
  if (args.preview === false) return false;
  if (args.preview === true) return true;
  return meta?.previewDefault === true;
}

export function previewBlock(
  tool: string,
  planned: Record<string, unknown>,
  hint?: string,
): Record<string, unknown> {
  return {
    dry_run: true,
    preview: true,
    action: tool,
    planned,
    hint:
      hint ??
      "Show this plan to the admin. Re-call the same tool with confirm:true (or preview:false) after they approve.",
  };
}
