'use client';

import { Download, RefreshCw, Search } from 'lucide-react';
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
  isLoading: boolean;
  downloadingCsv: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
}

export function UsersFilterBar({
  search,
  onSearchChange,
  accountTypeFilter,
  onAccountTypeFilterChange,
  onboardedFilter,
  onOnboardedFilterChange,
  isLoading,
  downloadingCsv,
  onRefresh,
  onExportCsv,
}: UsersFilterBarProps) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search username, email, or name"
          className="pl-9"
        />
      </div>
      <Select
        value={accountTypeFilter || 'all'}
        onValueChange={(v) => onAccountTypeFilterChange(v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All account types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All account types</SelectItem>
          <SelectItem value="Regular">Regular</SelectItem>
          <SelectItem value="Verified">Verified</SelectItem>
          <SelectItem value="CassetteTeam">CassetteTeam</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={onboardedFilter || 'all'}
        onValueChange={(v) => onOnboardedFilterChange(v === 'all' ? '' : v)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All onboarding states" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All onboarding states</SelectItem>
          <SelectItem value="true">Onboarded</SelectItem>
          <SelectItem value="false">Not onboarded</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={isLoading} className="flex-1">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        <Button onClick={onExportCsv} disabled={downloadingCsv || isLoading} className="flex-1">
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </div>
    </div>
  );
}
