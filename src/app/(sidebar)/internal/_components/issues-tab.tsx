'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { InternalIssueSummary, InternalIssueDetail, InternalIssuesResponse } from '@/types';
import { IssuesFilterBar } from './issues-filter-bar';
import { IssuesTable } from './issues-table';
import { DataTablePagination } from './data-table-pagination';
import { ErrorState } from './error-state';
import { IssueDetailPanel } from './issue-detail-panel';

interface IssuesTabProps {
  // Filter state
  search: string;
  onSearchChange: (value: string) => void;
  reportTypeFilter: string;
  onReportTypeFilterChange: (value: string) => void;
  sourceContextFilter: string;
  onSourceContextFilterChange: (value: string) => void;

  // Table state
  issuesResponse: InternalIssuesResponse | null;
  issuesLoading: boolean;
  issuesError: string | null;
  issuesPage: number;
  onPageChange: (page: number) => void;

  // Actions
  onRefresh: () => void;

  // Selection
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
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      {/* Master: table & filters */}
      <div className="min-w-0 flex-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Issue Inbox</CardTitle>
            <CardDescription>Read-only reports submitted via the in-app report button.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
      <div className="xl:w-[400px] xl:shrink-0 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto no-scrollbar">
        <IssueDetailPanel
          issue={selectedIssue}
          isLoading={selectedIssueLoading}
        />
      </div>
    </div>
  );
}
