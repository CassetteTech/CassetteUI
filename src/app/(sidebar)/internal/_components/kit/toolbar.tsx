'use client';

import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SegmentedControl as SlidingSegments } from '@/components/ui/interior/segmented-control';

/**
 * Shared filter toolbar. A flat search field plus a slot for per-tab filter
 * controls and an actions slot. Dense, no card chrome.
 */
export function Toolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters,
  actions,
  className,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {onSearchChange && (
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:border-domain focus:outline-none focus:ring-1 focus:ring-domain"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      {filters}
      {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/**
 * Dense segmented toggle, used for inline filters (account type, status, etc.).
 * Sliding thumb + radiogroup semantics via the interior primitive.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      )}
      <SlidingSegments
        label={label ?? 'Filter'}
        value={value}
        onValueChange={(next) => onChange(next as T)}
        options={options}
      />
    </div>
  );
}
