"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { templateDisplayName } from "@/lib/occasion-templates/apply";
import type { OccasionTemplate } from "@/lib/occasion-templates/types";

type Props = {
  onSelect: (template: OccasionTemplate) => void;
  disabled?: boolean;
};

export function OccasionTemplatesBar({ onSelect, disabled }: Props) {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [expanded, setExpanded] = useState(false);
  const [templates, setTemplates] = useState<OccasionTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/occasion-templates", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { templates?: OccasionTemplate[] }) => {
        if (!cancelled) setTemplates(data.templates ?? []);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!templates.length && !loading) return null;

  return (
    <div className="gb-templates">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setExpanded((v) => !v)}
        className="gb-templates__toggle"
        aria-expanded={expanded}
      >
        <Sparkles size={15} aria-hidden />
        {ar ? "ابدأ من قالب جاهز" : "Start from a template"}
        <ChevronRight
          size={15}
          className={`gb-templates__chevron ${expanded ? "is-open" : ""}`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="gb-templates__scroll" role="list">
          {loading ? (
            <p className="gb-templates__hint">{ar ? "جاري التحميل…" : "Loading…"}</p>
          ) : (
            templates.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={disabled}
                role="listitem"
                onClick={() => {
                  onSelect(template);
                  setExpanded(false);
                }}
                className="gb-templates__card"
              >
                <span className="gb-templates__emoji" aria-hidden>
                  {template.emoji ?? "🎁"}
                </span>
                <span className="gb-templates__name">
                  {templateDisplayName(template, lang)}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
