import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  processing: "bg-blue-100 text-blue-900 border-blue-200",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  partial: "bg-orange-100 text-orange-900 border-orange-200",
  failed: "bg-red-100 text-red-900 border-red-200",
};

export function ImportExportStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        STYLES[status] ?? "bg-gray-100 text-gray-800 border-gray-200",
        className,
      )}
    >
      {status}
    </span>
  );
}
