import { type ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
};

type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  caption?: string;
};

export function DataTable<T>({ columns, rows, getRowKey, caption }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-slate-50/80 text-xs uppercase tracking-[0.18em] text-slate-500 dark:bg-white/[0.03] dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={column.align === "right" ? "px-4 py-3 text-right font-semibold" : "px-4 py-3 text-left font-semibold"}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/10">
            {rows.map((row) => (
              <tr key={getRowKey(row)} className="transition hover:bg-slate-50/80 dark:hover:bg-white/[0.035]">
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "px-4 py-4 text-right" : "px-4 py-4"}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
