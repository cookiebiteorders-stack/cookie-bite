/** Bilingual admin label: English title + Arabic subtitle (shown together). */
export function AdminBilingualLabel({
  en,
  ar,
  htmlFor,
  className = "",
}: {
  en: string;
  ar: string;
  htmlFor?: string;
  className?: string;
}) {
  const Tag = htmlFor ? "label" : "div";
  return (
    <Tag htmlFor={htmlFor} className={`block space-y-0.5 ${className}`.trim()}>
      <span className="text-xs font-bold text-cb-text-strong">{en}</span>
      <span className="block text-[11px] font-medium text-cb-text-muted">{ar}</span>
    </Tag>
  );
}

export function AdminBilingualSection({
  en,
  ar,
  className = "",
}: {
  en: string;
  ar: string;
  className?: string;
}) {
  return (
    <div className={`border-b border-cb-border pb-2 ${className}`.trim()}>
      <h2 className="text-sm font-bold text-cb-text-strong">{en}</h2>
      <p className="text-xs font-medium text-cb-text-muted">{ar}</p>
    </div>
  );
}
