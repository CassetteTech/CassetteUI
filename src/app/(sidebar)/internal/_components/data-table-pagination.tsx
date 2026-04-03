'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  itemLabel: string;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function DataTablePagination({
  page,
  totalPages,
  totalItems,
  itemLabel,
  isLoading,
  onPageChange,
}: DataTablePaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);

  const getPageNumbers = () => {
    const pages: number[] = [];
    let start = Math.max(1, page - 2);
    const end = Math.min(safeTotalPages, start + 4);
    start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
      <p className="text-[11px] text-muted-foreground tabular-nums">
        Page {page} of {safeTotalPages} &middot; {totalItems.toLocaleString()} {itemLabel}
      </p>
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page <= 1 || isLoading}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {getPageNumbers().map((p) => (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="icon"
            className={`hidden h-7 w-7 text-xs sm:inline-flex ${p === page ? '' : 'text-muted-foreground'}`}
            disabled={isLoading}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page >= safeTotalPages || isLoading}
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={page >= safeTotalPages || isLoading}
          onClick={() => onPageChange(safeTotalPages)}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
