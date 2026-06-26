'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Compact pager: a terse "page x / y · n items" readout and prev/next steppers.
 * No numbered buttons — keeps the footer to a single dense line.
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  itemLabel,
  isLoading,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}) {
  const safeTotal = Math.max(totalPages, 1);
  const step = (delta: number) => onPageChange(Math.min(safeTotal, Math.max(1, page + delta)));

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {page}/{safeTotal} · {totalItems.toLocaleString()} {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Stepper disabled={page <= 1 || isLoading} onClick={() => step(-1)} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Stepper>
        <Stepper disabled={page >= safeTotal || isLoading} onClick={() => step(1)} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </Stepper>
      </div>
    </div>
  );
}

function Stepper({
  children,
  disabled,
  onClick,
  ...rest
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded border border-border text-muted-foreground transition-colors',
        'hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent'
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
