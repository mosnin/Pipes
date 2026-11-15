"use client";

import type { ReactNode } from "react";
import { DataTable, TBody, TD, TH, THead, TR, Table, TableFooter } from "@/components/data/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface RecordColumn {
  label: ReactNode;
  numeric?: boolean;
  /** Width or alignment for the column, applied to the header cell. */
  className?: string;
  /** Visually hidden label, for an actions column. */
  hidden?: boolean;
}

export interface RecordRow {
  key: string;
  cells: ReactNode[];
}

/**
 * The Company OS index table, composed once for the settings and operator
 * pages: a bordered object with a 35px inset header, horizontally ruled rows,
 * and a record count in the footer.
 *
 * Zero-data keeps the header row so the columns still say what the missing
 * rows would mean, and puts the empty state in one full-span cell; the footer
 * is dropped, because the count of a table listing nothing is not information.
 */
export function RecordTable({
  columns,
  rows,
  empty,
  noun,
  loading = false,
  footer = true,
  className
}: {
  columns: RecordColumn[];
  rows: RecordRow[];
  empty: ReactNode;
  noun?: string;
  loading?: boolean;
  footer?: boolean;
  className?: string;
}) {
  // The column that names the record (the first one without a set width)
  // holds 180px below the table's natural width and the table scrolls,
  // rather than the name being crushed to a few characters by fixed columns.
  const primary = columns.findIndex((column) => !column.className && !column.numeric && !column.hidden);
  return (
    <DataTable className={className}>
      <Table>
        <THead>
          <TR>
            {columns.map((column, index) => (
              <TH key={index} numeric={column.numeric} className={cn(index === primary && "min-w-[180px]", column.className)}>
                {column.hidden ? <span className="sr-only">{column.label}</span> : column.label}
              </TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {loading ? (
            [0, 1, 2].map((row) => (
              <TR key={row}>
                {columns.map((column, index) => (
                  <TD key={index} numeric={column.numeric}>
                    <Skeleton className={cn("h-[12px]", column.numeric ? "ml-auto w-[32px]" : "w-[96px]")} />
                  </TD>
                ))}
              </TR>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0 align-middle">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <TR key={row.key}>
                {row.cells.map((cell, index) => (
                  <TD key={index} numeric={columns[index]?.numeric}>
                    {cell}
                  </TD>
                ))}
              </TR>
            ))
          )}
        </TBody>
      </Table>
      {footer && !loading && rows.length > 0 ? <TableFooter count={rows.length} noun={noun} /> : null}
    </DataTable>
  );
}
