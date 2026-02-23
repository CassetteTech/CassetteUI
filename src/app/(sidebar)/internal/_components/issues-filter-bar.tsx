'use client';

import { RefreshCw, Search } from 'lucide-react';
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
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search ID, type, context, or URL"
          className="pl-9"
        />
      </div>
      <Input
        value={reportTypeFilter}
        onChange={(e) => onReportTypeFilterChange(e.target.value)}
        placeholder="reportType filter"
      />
      <Input
        value={sourceContextFilter}
        onChange={(e) => onSourceContextFilterChange(e.target.value)}
        placeholder="sourceContext filter"
      />
      <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
}
