import { dedupeAddonOptions } from "@/lib/addons/dedupe";
import type { Addon } from "@/lib/addons/types";

export type AddonSubmitPayload = {
  id?: string;
  name: string;
  description: string | null;
  type: Addon["type"];
  required: boolean;
  options: Array<{
    id: string;
    name: string;
    size: string | null;
    price: number;
    quantity_limit: number | null;
    default_selected: boolean;
  }>;
};

/** Normalize add-on body from API/client (strip empty id, empty size). */
export function normalizeAddonInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (o.id === "" || o.id === null) delete o.id;
  if (Array.isArray(o.options)) {
    o.options = o.options.map((opt) => {
      if (!opt || typeof opt !== "object") return opt;
      const row = { ...(opt as Record<string, unknown>) };
      if (row.size === "") row.size = null;
      if (typeof row.name === "string") row.name = row.name.trim();
      return row;
    });
  }
  if (typeof o.name === "string") o.name = o.name.trim();
  if (typeof o.description === "string") {
    const d = o.description.trim();
    o.description = d.length ? d : null;
  }
  return o;
}

export function validateAddonForm(form: Addon): string | null {
  if (!form.name.trim()) {
    return "Add-on name is required. / اسم الإضافة مطلوب.";
  }
  if (!form.options.length) {
    return "Add at least one option. / أضف خياراً واحداً على الأقل.";
  }
  const missingName = form.options.findIndex((o) => !o.name.trim());
  if (missingName >= 0) {
    return `Option ${missingName + 1} needs a name. / الخيار ${missingName + 1} يحتاج اسماً.`;
  }
  return null;
}

export function buildAddonSubmitPayload(form: Addon, editingId: string | null): AddonSubmitPayload {
  const options = dedupeAddonOptions(form.options).map((o) => ({
    id: o.id?.trim() || crypto.randomUUID(),
    name: o.name.trim(),
    size: o.size?.trim() ? o.size.trim() : null,
    price: Math.max(0, Number(o.price) || 0),
    quantity_limit:
      o.quantity_limit != null && Number.isFinite(o.quantity_limit) && o.quantity_limit > 0
        ? o.quantity_limit
        : null,
    default_selected: Boolean(o.default_selected),
  }));

  const base: AddonSubmitPayload = {
    name: form.name.trim(),
    description: form.description?.trim() ? form.description.trim() : null,
    type: form.type,
    required: Boolean(form.required),
    options,
  };

  if (editingId) return { ...base, id: editingId };
  return base;
}
