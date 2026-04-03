'use client';

import { ArrowDownAZ, ArrowUpAZ, Download, RefreshCw, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UsersFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  accountTypeFilter: string;
  onAccountTypeFilterChange: (value: string) => void;
  onboardedFilter: string;
  onOnboardedFilterChange: (value: string) => void;
  sortBy: 'joinDate' | 'lastOnlineAt' | 'likesAllTime' | 'likes30d';
  onSortByChange: (value: 'joinDate' | 'lastOnlineAt' | 'likesAllTime' | 'likes30d') => void;
  sortDirection: 'asc' | 'desc';
  onSortDirectionChange: (value: 'asc' | 'desc') => void;
  isLoading: boolean;
  downloadingCsv: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

const ACCOUNT_TYPES = [
  { value: '', label: 'All' },
  { value: 'Regular', label: 'Regular' },
  { value: 'Verified', label: 'Verified' },
  { value: 'CassetteTeam', label: 'Team' },
] as const;

const ONBOARDED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Onboarded' },
  { value: 'false', label: 'Not yet' },
] as const;

export function UsersFilterBar({
  search,
  onSearchChange,
  accountTypeFilter,
  onAccountTypeFilterChange,
  onboardedFilter,
  onOnboardedFilterChange,
  sortBy,
  onSortByChange,
  sortDirection,
  onSortDirectionChange,
  isLoading,
  downloadingCsv,
  onRefresh,
  onExportCsv,
}: UsersFilterBarProps) {
  const hasActiveFilters = accountTypeFilter !== '' || onboardedFilter !== '' || search !== '';

  return (
    <div className="space-y-3">
      {/* Row 1: Search + Actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search username, email, or name..."
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
        <Button size="sm" onClick={onExportCsv} disabled={downloadingCsv || isLoading} className="shrink-0 gap-1.5">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Row 2: Inline filter chips + Sort */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Account Type Toggle Group */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">Type</span>
          <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
            {ACCOUNT_TYPES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onAccountTypeFilterChange(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  accountTypeFilter === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Onboarded Toggle Group */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground shrink-0">Status</span>
          <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5">
            {ONBOARDED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onOnboardedFilterChange(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  onboardedFilter === opt.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spacer pushes sort to end */}
        <div className="flex-1" />

        {/* Sort Controls */}
        <div className="flex items-center gap-1.5">
          <Select
            value={sortBy}
            onValueChange={(v: 'joinDate' | 'lastOnlineAt' | 'likesAllTime' | 'likes30d') => onSortByChange(v)}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="likesAllTime">Likes (all-time)</SelectItem>
              <SelectItem value="likes30d">Likes (30d)</SelectItem>
              <SelectItem value="lastOnlineAt">Last online</SelectItem>
              <SelectItem value="joinDate">Join date</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
          >
            {sortDirection === 'desc' ? (
              <ArrowDownAZ className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpAZ className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              onSearchChange('');
              onAccountTypeFilterChange('');
              onOnboardedFilterChange('');
            }}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
