'use client';

import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { InternalIssueSummary, InternalIssueDetail, InternalIssuesResponse } from '@/types';
import { Panel, DataTable, Toolbar, Pagination, type Column } from './kit';
import { formatDate } from './internal-utils';
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

function FilterInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-[150px] rounded-md border border-border bg-background px-2.5 pr-6 text-xs text-foreground placeholder:text-muted-foreground focus:border-domain focus:outline-none focus:ring-1 focus:ring-domain"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function IssuesTab({
  search, onSearchChange, reportTypeFilter, onReportTypeFilterChange,
  sourceContextFilter, onSourceContextFilterChange, issuesResponse, issuesLoading,
  issuesError, issuesPage, onPageChange, onRefresh, selectedIssue, selectedIssueLoading, onSelectIssue,
}: IssuesTabProps) {
  const columns: Column<InternalIssueSummary>[] = [
    {
      key: 'report',
      header: 'Report',
      cell: (i) => (
        <div className="min-w-0">
          <span className="block truncate font-medium text-foreground">{i.reportType}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{i.sourceContext}</span>
        </div>
      ),
    },
    {
      key: 'reporter',
      header: 'Reporter',
      className: 'hidden sm:table-cell',
      cell: (i) => <span className="truncate text-muted-foreground">{i.username || i.userEmail || 'Anonymous'}</span>,
    },
    {
      key: 'date',
      header: 'Date',
      align: 'right',
      className: 'hidden md:table-cell',
      cell: (i) => <span className="text-muted-foreground">{formatDate(i.createdAt)}</span>,
    },
  ];

  const renderMobile = (i: InternalIssueSummary) => (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium text-foreground">{i.reportType}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{formatDate(i.createdAt)}</span>
      </div>
      <p className="truncate text-[11px] text-muted-foreground">
        {i.sourceContext} · {i.username || i.userEmail || 'Anonymous'}
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-3">
        <Toolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search ID, correlation, job, route…"
          filters={
            <>
              <FilterInput value={reportTypeFilter} onChange={onReportTypeFilterChange} placeholder="Report type" />
              <FilterInput value={sourceContextFilter} onChange={onSourceContextFilterChange} placeholder="Source context" />
            </>
          }
          actions={
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={onRefresh} disabled={issuesLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${issuesLoading ? 'animate-spin' : ''}`} />
            </Button>
          }
        />

        <Panel bodyClassName="overflow-hidden rounded-b-lg">
          {issuesError ? (
            <div className="px-3 py-10 text-center text-sm text-destructive">{issuesError}</div>
          ) : (
            <DataTable
              columns={columns}
              rows={issuesResponse?.items ?? []}
              rowKey={(i) => i.id}
              onRowClick={onSelectIssue}
              selectedKey={selectedIssue?.id ?? null}
              isLoading={issuesLoading}
              empty={{ icon: AlertCircle, title: 'No issues', description: 'No issues match these filters.' }}
              renderMobile={renderMobile}
            />
          )}
          <Pagination
            page={issuesResponse?.page ?? issuesPage}
            totalPages={issuesResponse?.totalPages ?? 1}
            totalItems={issuesResponse?.totalItems ?? 0}
            itemLabel="issues"
            isLoading={issuesLoading}
            onPageChange={onPageChange}
          />
        </Panel>
      </div>

      <div className="xl:w-[380px] xl:shrink-0 xl:sticky xl:top-2 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto no-scrollbar">
        <IssueDetailPanel issue={selectedIssue} isLoading={selectedIssueLoading} />
      </div>
    </div>
  );
}
