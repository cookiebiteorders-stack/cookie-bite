"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

type TopPageRow = {
  path: string;
  views: number;
  unique_visitors: number;
};

type Props = {
  pages: TopPageRow[];
};

export function TopPagesPanel({ pages }: Props) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (pages.length === 0) {
    return <p className="mt-3 text-center text-sm text-cb-text-muted">No data.</p>;
  }

  if (!isDesktop) {
    return (
      <ul className="mt-3 flex w-full min-w-0 max-w-full flex-col gap-2">
        {pages.map((row) => (
          <li
            key={row.path}
            className="box-border w-full max-w-full rounded-xl border border-cb-border bg-cb-surface/60 p-3 shadow-sm"
          >
            <p className="break-all font-mono text-xs font-semibold text-cb-text-strong" dir="ltr">
              {row.path}
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="font-semibold text-cb-text-muted">Views</dt>
                <dd className="mt-0.5 text-base font-bold text-cb-text-strong">
                  {row.views.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-cb-text-muted">Unique visitors</dt>
                <dd className="mt-0.5 text-base font-bold text-cb-text-strong">
                  {row.unique_visitors.toLocaleString()}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="admin-table-scroll mt-3 w-full min-w-0 max-w-full">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[52%]" />
          <col className="w-[24%]" />
          <col className="w-[24%]" />
        </colgroup>
        <thead className="text-start text-cb-text-muted">
          <tr className="border-b border-cb-border">
            <th className="py-2 pe-4 text-start">Path</th>
            <th className="py-2 pe-4 text-end">Views</th>
            <th className="py-2 pe-4 text-end">Unique visitors</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((row) => (
            <tr key={row.path} className="border-b border-cb-border last:border-b-0">
              <td className="py-2 pe-4 font-mono text-xs text-cb-text">
                <span className="break-all" dir="ltr">
                  {row.path}
                </span>
              </td>
              <td className="py-2 pe-4 text-end font-semibold tabular-nums">
                {row.views.toLocaleString()}
              </td>
              <td className="py-2 pe-4 text-end tabular-nums">
                {row.unique_visitors.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
