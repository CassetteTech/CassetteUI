'use client';

import { RefreshCw, Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface IssuesFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  reportTypeFilter: string;
  onReportTypeFilterChange: (value: string) => void;
  sourceContextFilter: string;
  onSourceContextFilterChange: (value: string) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export function IssuesFilterBar({
  search,
  onSearchChange,
  reportTypeFilter,
  onReportTypeFilterChange,
  sourceContextFilter,
  onSourceContextFilterChange,
  isLoading,
  onRefresh,
}: IssuesFilterBarProps) {
  const hasFilters = search !== '' || reportTypeFilter !== '' || sourceContextFilter !== '';

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Refresh */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search issues by ID, user, URL..."
            className="pl-9 pr-8"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading} className="shrink-0 h-9 w-9">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Row 2: Dimension filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="relative">
          <Input
            value={reportTypeFilter}
            onChange={(e) => onReportTypeFilterChange(e.target.value)}
            placeholder="Report type..."
            className="h-8 w-[160px] text-xs pl-3 pr-7"
          />
          {reportTypeFilter && (
            <button
              onClick={() => onReportTypeFilterChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="relative">
          <Input
            value={sourceContextFilter}
            onChange={(e) => onSourceContextFilterChange(e.target.value)}
            placeholder="Source context..."
            className="h-8 w-[160px] text-xs pl-3 pr-7"
          />
          {sourceContextFilter && (
            <button
              onClick={() => onSourceContextFilterChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              onSearchChange('');
              onReportTypeFilterChange('');
              onSourceContextFilterChange('');
            }}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
