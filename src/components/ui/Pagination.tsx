import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (next: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 8);
  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="h-9 rounded-md border border-cb-border px-3 text-sm disabled:opacity-50"
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cn(
            "h-9 min-w-9 rounded-md border px-3 text-sm",
            p === page
              ? "border-cb-terracotta-dark bg-cb-terracotta-dark text-white"
              : "border-cb-border text-cb-text-strong",
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="h-9 rounded-md border border-cb-border px-3 text-sm disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}

