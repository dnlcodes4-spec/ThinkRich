import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Extra classes for this column's cells (e.g. `font-mono`, alignment). */
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Accessible description of the table. */
  caption?: string;
  className?: string;
};

/**
 * Presentational desktop table. Pair with `RecordCard` for mobile — render this
 * inside a `hidden lg:block` wrapper and the card list inside `lg:hidden`. Wide
 * content scrolls inside this container, never the page.
 * See docs/design/responsive-and-dashboards.md.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  caption,
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse overflow-hidden rounded-card border border-border text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "border-b border-border bg-surface-muted px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "border-b border-border px-4 py-3 last:[&>*]:mb-0",
                    column.className,
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
