'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right';
  /** Vertical alignment of the cell body. Defaults to 'middle'; use 'top' for
   *  columns that hold tall wrapped content (e.g. long descriptions) so they
   *  don't float against short neighbours. */
  valign?: 'top' | 'middle';
  /** Responsive visibility / width, e.g. 'hidden xl:table-cell'. Applied to th + td. */
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  isLoading?: boolean;
  skeletonRows?: number;
  empty?: { icon?: LucideIcon; title: string; description?: string };
  /** Compact card renderer for narrow viewports (below lg). Falls back to a
   *  generic stack of the visible columns if omitted. */
  renderMobile?: (row: T) => ReactNode;
}

/**
 * Generic dense table shared by every dashboard tab. Desktop renders a real
 * <table>; columns hide progressively via their `className` (e.g. xl:table-cell)
 * so the grid never needs horizontal scroll. Below `lg` it switches to a stacked
 * card list (custom `renderMobile` or an auto fallback). Selection, hover,
 * loading skeletons and empty state are handled here once.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  isLoading,
  skeletonRows = 8,
  empty,
  renderMobile,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    const Icon = empty?.icon;
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-4 py-12 text-center">
        {Icon && <Icon className="h-5 w-5 text-muted-foreground/60" />}
        <p className="text-sm font-medium text-foreground">{empty?.title ?? 'No results'}</p>
        {empty?.description && <p className="text-xs text-muted-foreground">{empty.description}</p>}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground',
                  col.align === 'right' ? 'text-right' : 'text-left',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = selectedKey === key;
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-border/60 transition-colors',
                  onRowClick && 'cursor-pointer',
                  selected
                    ? 'bg-domain/[0.07] text-foreground'
                    : onRowClick && 'hover:bg-muted/50'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 py-2 text-xs text-foreground',
                      col.valign === 'top' ? 'align-top' : 'align-middle',
                      col.align === 'right' && 'text-right tabular-nums',
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile list */}
      <div className="divide-y divide-border lg:hidden">
        {rows.map((row) => {
          const key = rowKey(row);
          const selected = selectedKey === key;
          return (
            <div
              key={key}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'px-3 py-2.5',
                onRowClick && 'cursor-pointer',
                selected ? 'bg-domain/[0.07]' : onRowClick && 'hover:bg-muted/40'
              )}
            >
              {renderMobile ? (
                renderMobile(row)
              ) : (
                <div className="space-y-1">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {col.header}
                      </span>
                      <span className="min-w-0 text-right text-xs text-foreground">{col.cell(row)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
