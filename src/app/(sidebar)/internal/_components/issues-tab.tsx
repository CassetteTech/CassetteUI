'use client';

import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InternalIssueSummary, InternalIssueDetail, InternalIssuesResponse } from '@/types';
import { IssuesFilterBar } from './issues-filter-bar';
import { IssuesTable } from './issues-table';
import { DataTablePagination } from './data-table-pagination';
import { ErrorState } from './error-state';
import { IssueDetailPanel } from './issue-detail-panel';

interface IssuesTabProps {
  search: string;
  onSearchChange: (value: string) => void;
  reportTypeFilter: string;
  onReportTypeFilterChange: (value: string) => void;
  sourceContextFilter: string;
  onSourceContextFilterChange: (value: string) => void;
  issuesResponse: InternalIssuesResponse | null;
  issuesLoading: boolean;
  issuesError: string | null;
  issuesPage: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  selectedIssue: InternalIssueDetail | null;
  selectedIssueLoading: boolean;
  onSelectIssue: (issue: InternalIssueSummary) => void;
}

export function IssuesTab({
  search,
  onSearchChange,
  reportTypeFilter,
  onReportTypeFilterChange,
  sourceContextFilter,
  onSourceContextFilterChange,
  issuesResponse,
  issuesLoading,
  issuesError,
  issuesPage,
  onPageChange,
  onRefresh,
  selectedIssue,
  selectedIssueLoading,
  onSelectIssue,
}: IssuesTabProps) {
  const totalIssues = issuesResponse?.totalItems ?? 0;
  const hasActiveFilters = search !== '' || reportTypeFilter !== '' || sourceContextFilter !== '';

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      {/* Master: table & filters */}
      <div className="min-w-0 flex-1">
        <Card>
          <div className="px-6 pt-5 pb-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                </div>
                <h2 className="text-base font-semibold">Issue Inbox</h2>
                {totalIssues > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {totalIssues}
                  </Badge>
                )}
              </div>
              {hasActiveFilters && (
                <span className="text-[11px] text-muted-foreground">
                  Filtered results
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Reports submitted via the in-app report button. Read-only.
            </p>
          </div>
          <CardContent className="space-y-4 pt-0">
            <IssuesFilterBar
              search={search}
              onSearchChange={onSearchChange}
              reportTypeFilter={reportTypeFilter}
              onReportTypeFilterChange={onReportTypeFilterChange}
              sourceContextFilter={sourceContextFilter}
              onSourceContextFilterChange={onSourceContextFilterChange}
              isLoading={issuesLoading}
              onRefresh={onRefresh}
            />

            {issuesError && <ErrorState message={issuesError} onRetry={onRefresh} />}

            <IssuesTable
              issues={issuesResponse?.items ?? []}
              isLoading={issuesLoading}
              selectedIssueId={selectedIssue?.id ?? null}
              onSelectIssue={onSelectIssue}
            />

            <DataTablePagination
              page={issuesResponse?.page ?? issuesPage}
              totalPages={issuesResponse?.totalPages ?? 1}
              totalItems={issuesResponse?.totalItems ?? 0}
              itemLabel="issues"
              isLoading={issuesLoading}
              onPageChange={onPageChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detail: sticky side panel */}
      <div className="xl:w-[420px] xl:shrink-0 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto no-scrollbar">
        <IssueDetailPanel
          issue={selectedIssue}
          isLoading={selectedIssueLoading}
        />
      </div>
    </div>
  );
}
