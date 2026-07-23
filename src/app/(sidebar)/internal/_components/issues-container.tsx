'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { apiService } from '@/services/api';
import {
  InternalIssueDetail,
  InternalIssueSummary,
  InternalIssuesResponse,
} from '@/types';
import { SectionHeader } from './kit/primitives';
import { PAGE_SIZE } from './internal-utils';
import { IssuesTab } from './issues-tab';

/**
 * Owns all Issues state — lifted verbatim from the old InternalDashboardShell.
 * The previous `activeTab === 'issues'` lazy guard is gone: the route only mounts
 * when navigated to, so the unconditional mount effect reproduces the same
 * "fetch when viewing" behaviour.
 */
export function IssuesContainer() {
  const searchParams = useSearchParams();
  const requestedIssueId = searchParams.get('issue') ?? '';
  const [issueSearch, setIssueSearch] = useState('');
  const [issueReportTypeFilter, setIssueReportTypeFilter] = useState('');
  const [issueSourceContextFilter, setIssueSourceContextFilter] = useState('');
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesResponse, setIssuesResponse] = useState<InternalIssuesResponse | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<InternalIssueDetail | null>(null);
  const [selectedIssueLoading, setSelectedIssueLoading] = useState(false);

  const debouncedIssueSearch = useDebounce(issueSearch, 300);

  const loadIssues = useCallback(async () => {
    setIssuesLoading(true);
    setIssuesError(null);
    try {
      const response = await apiService.getInternalIssues({
        q: debouncedIssueSearch || undefined,
        reportType: issueReportTypeFilter || undefined,
        sourceContext: issueSourceContextFilter || undefined,
        page: issuesPage,
        pageSize: PAGE_SIZE,
      });
      setIssuesResponse(response);
    } catch (error) {
      setIssuesError(error instanceof Error ? error.message : 'Failed to load issues');
    } finally {
      setIssuesLoading(false);
    }
  }, [debouncedIssueSearch, issueReportTypeFilter, issueSourceContextFilter, issuesPage]);

  const loadIssueDetail = useCallback(async (issueId: string) => {
    setSelectedIssueLoading(true);
    try {
      const detail = await apiService.getInternalIssueById(issueId);
      setSelectedIssue(detail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load issue details');
    } finally {
      setSelectedIssueLoading(false);
    }
  }, []);

  useEffect(() => { void loadIssues(); }, [loadIssues]);
  useEffect(() => {
    if (!requestedIssueId) return;
    void loadIssueDetail(requestedIssueId);
  }, [loadIssueDetail, requestedIssueId]);

  const handleSelectIssue = (summary: InternalIssueSummary) => {
    void loadIssueDetail(summary.id);
    const url = new URL(window.location.href);
    url.searchParams.set('issue', summary.id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  const handleIssueSearchChange = (value: string) => { setIssueSearch(value); setIssuesPage(1); };
  const handleIssueReportTypeFilterChange = (value: string) => { setIssueReportTypeFilter(value); setIssuesPage(1); };
  const handleIssueSourceContextFilterChange = (value: string) => { setIssueSourceContextFilter(value); setIssuesPage(1); };

  return (
    <div className="space-y-4">
      <SectionHeader section="Engineering" title="Issues" count={issuesResponse?.totalItems} />
      <IssuesTab
        search={issueSearch}
        onSearchChange={handleIssueSearchChange}
        reportTypeFilter={issueReportTypeFilter}
        onReportTypeFilterChange={handleIssueReportTypeFilterChange}
        sourceContextFilter={issueSourceContextFilter}
        onSourceContextFilterChange={handleIssueSourceContextFilterChange}
        issuesResponse={issuesResponse}
        issuesLoading={issuesLoading}
        issuesError={issuesError}
        issuesPage={issuesPage}
        onPageChange={setIssuesPage}
        onRefresh={() => void loadIssues()}
        selectedIssue={selectedIssue}
        selectedIssueLoading={selectedIssueLoading}
        onSelectIssue={handleSelectIssue}
      />
    </div>
  );
}
