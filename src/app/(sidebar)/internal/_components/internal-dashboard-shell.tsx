'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Users, AlertCircle, Shield } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { apiService, ApiError } from '@/services/api';
import {
  InternalAccountTypeAuditEntry,
  InternalIssueDetail,
  InternalIssueSummary,
  InternalIssuesResponse,
  InternalUserDetail,
  InternalUserSummary,
  InternalUsersResponse,
} from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { normalizeAccountType, PAGE_SIZE } from './internal-utils';
import { UsersTab } from './users-tab';
import { IssuesTab } from './issues-tab';

export function InternalDashboardShell() {
  const usersRequestIdRef = useRef(0);
  const [activeTab, setActiveTab] = useState<'users' | 'issues'>('users');

  // ─── Users state ───────────────────────────────────────────────────
  const [userSearch, setUserSearch] = useState('');
  const [userAccountTypeFilter, setUserAccountTypeFilter] = useState('');
  const [userOnboardedFilter, setUserOnboardedFilter] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersResponse, setUsersResponse] = useState<InternalUsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<InternalUserDetail | null>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [selectedUserAudit, setSelectedUserAudit] = useState<InternalAccountTypeAuditEntry[]>([]);
  const [selectedUserAuditLoading, setSelectedUserAuditLoading] = useState(false);
  const [targetAccountType, setTargetAccountType] = useState<'Regular' | 'Verified' | 'CassetteTeam'>('Regular');
  const [targetCanAssignVerified, setTargetCanAssignVerified] = useState(false);
  const [accountTypeReason, setAccountTypeReason] = useState('');
  const [updatingAccountType, setUpdatingAccountType] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // ─── Issues state ──────────────────────────────────────────────────
  const [issueSearch, setIssueSearch] = useState('');
  const [issueReportTypeFilter, setIssueReportTypeFilter] = useState('');
  const [issueSourceContextFilter, setIssueSourceContextFilter] = useState('');
  const [issuesPage, setIssuesPage] = useState(1);
  const [issuesResponse, setIssuesResponse] = useState<InternalIssuesResponse | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesError, setIssuesError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<InternalIssueDetail | null>(null);
  const [selectedIssueLoading, setSelectedIssueLoading] = useState(false);

  // ─── Derived ───────────────────────────────────────────────────────
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedIssueSearch = useDebounce(issueSearch, 300);
  const actorCanAssignVerified = usersResponse?.actorCanAssignVerified ?? false;

  const selectedUserAccountType = useMemo(
    () => normalizeAccountType(selectedUser?.accountType as string | number | undefined),
    [selectedUser?.accountType]
  );

  // ─── Data loading ──────────────────────────────────────────────────
  const hydratePostCountsIfNeeded = async (users: InternalUserSummary[], requestId: number) => {
    if (!users.length) return;

    const counts = new Map<string, number>();
    const workerCount = Math.min(5, users.length);
    let cursor = 0;

    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const idx = cursor;
        cursor += 1;
        if (idx >= users.length) break;

        const user = users[idx];
        try {
          const detail = await apiService.getInternalUserById(user.userId);
          const detailCount = Number(detail.user.postCount);
          if (Number.isFinite(detailCount)) {
            counts.set(user.userId, detailCount);
            continue;
          }

          const fallbackCount = await apiService.getUserPostCount(user.userId);
          counts.set(user.userId, fallbackCount);
        } catch {
          counts.set(user.userId, 0);
        }
      }
    });

    await Promise.all(workers);
    if (requestId !== usersRequestIdRef.current) return;

    setUsersResponse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => ({
          ...item,
          postCount: counts.get(item.userId) ?? item.postCount ?? 0,
        })),
      };
    });
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    const requestId = usersRequestIdRef.current + 1;
    usersRequestIdRef.current = requestId;
    try {
      const response = await apiService.getInternalUsers({
        q: debouncedUserSearch || undefined,
        accountType: userAccountTypeFilter || undefined,
        isOnboarded: userOnboardedFilter || undefined,
        page: usersPage,
        pageSize: PAGE_SIZE,
      });
      const normalizedItems = response.items.map((item) => {
        const parsedPostCount = Number(item.postCount);
        return {
          ...item,
          postCount: Number.isFinite(parsedPostCount) ? parsedPostCount : 0,
        };
      });

      setUsersResponse({
        ...response,
        items: normalizedItems,
      });

      const allZero = normalizedItems.every((item) => (item.postCount ?? 0) === 0);
      if (allZero) {
        void hydratePostCountsIfNeeded(normalizedItems, requestId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users';
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    setSelectedUserLoading(true);
    try {
      const detail = await apiService.getInternalUserById(userId);
      setSelectedUser(detail.user);
      const normalizedType = normalizeAccountType(detail.user.accountType as string | number);
      if (normalizedType === 'Regular' || normalizedType === 'Verified' || normalizedType === 'CassetteTeam') {
        setTargetAccountType(normalizedType);
      } else {
        setTargetAccountType('Regular');
      }
      setTargetCanAssignVerified(Boolean(detail.user.canAssignVerified));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load user details';
      toast.error(message);
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const loadUserAudit = async (userId: string) => {
    setSelectedUserAuditLoading(true);
    try {
      const audit = await apiService.getInternalUserAccountTypeAudit(userId);
      setSelectedUserAudit(audit);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load audit log';
      toast.error(message);
    } finally {
      setSelectedUserAuditLoading(false);
    }
  };

  const loadIssues = async () => {
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
      const message = error instanceof Error ? error.message : 'Failed to load issues';
      setIssuesError(message);
    } finally {
      setIssuesLoading(false);
    }
  };

  const loadIssueDetail = async (issueId: string) => {
    setSelectedIssueLoading(true);
    try {
      const detail = await apiService.getInternalIssueById(issueId);
      setSelectedIssue(detail);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load issue details';
      toast.error(message);
    } finally {
      setSelectedIssueLoading(false);
    }
  };

  // ─── Effects ───────────────────────────────────────────────────────
  useEffect(() => {
    void loadUsers();
  }, [debouncedUserSearch, userAccountTypeFilter, userOnboardedFilter, usersPage]);

  useEffect(() => {
    if (activeTab === 'issues') {
      void loadIssues();
    }
  }, [activeTab, debouncedIssueSearch, issueReportTypeFilter, issueSourceContextFilter, issuesPage]);

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleSelectUser = async (summary: InternalUserSummary) => {
    setAccountTypeReason('');
    await Promise.all([loadUserDetails(summary.userId), loadUserAudit(summary.userId)]);
  };

  const handleSelectIssue = (summary: InternalIssueSummary) => {
    void loadIssueDetail(summary.id);
  };

  const handleUpdateInternalAccess = async () => {
    if (!selectedUser) return;
    const reason = accountTypeReason.trim();
    if (!reason) {
      toast.error('A reason is required for internal access changes.');
      return;
    }

    const normalizedCurrentType = normalizeAccountType(selectedUser.accountType as string | number);
    const currentType = normalizedCurrentType === 'Regular' || normalizedCurrentType === 'Verified' || normalizedCurrentType === 'CassetteTeam'
      ? normalizedCurrentType
      : 'Unknown';
    const effectiveTargetCanAssign = targetAccountType === 'CassetteTeam' ? targetCanAssignVerified : false;
    const effectiveCurrentCanAssign = normalizedCurrentType === 'CassetteTeam'
      ? Boolean(selectedUser.canAssignVerified)
      : false;

    if (currentType === targetAccountType && effectiveCurrentCanAssign === effectiveTargetCanAssign) {
      toast.error('No changes to apply.');
      return;
    }

    setUpdatingAccountType(true);
    try {
      await apiService.updateInternalUserInternalAccess(selectedUser.userId, {
        accountType: targetAccountType,
        canAssignVerified: effectiveTargetCanAssign,
        reason,
      });
      toast.success('Internal access updated.');
      setAccountTypeReason('');
      await Promise.all([
        loadUsers(),
        loadUserDetails(selectedUser.userId),
        loadUserAudit(selectedUser.userId),
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update account type.');
      }
    } finally {
      setUpdatingAccountType(false);
    }
  };

  const handleExportCsv = async () => {
    setDownloadingCsv(true);
    try {
      const blob = await apiService.exportInternalUsersCsv({
        q: debouncedUserSearch || undefined,
        accountType: userAccountTypeFilter || undefined,
        isOnboarded: userOnboardedFilter || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `internal-users-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export CSV';
      toast.error(message);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
    setUsersPage(1);
  };

  const handleUserAccountTypeFilterChange = (value: string) => {
    setUserAccountTypeFilter(value);
    setUsersPage(1);
  };

  const handleUserOnboardedFilterChange = (value: string) => {
    setUserOnboardedFilter(value);
    setUsersPage(1);
  };

  const handleIssueSearchChange = (value: string) => {
    setIssueSearch(value);
    setIssuesPage(1);
  };

  const handleIssueReportTypeFilterChange = (value: string) => {
    setIssueReportTypeFilter(value);
    setIssuesPage(1);
  };

  const handleIssueSourceContextFilterChange = (value: string) => {
    setIssueSourceContextFilter(value);
    setIssuesPage(1);
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as 'users' | 'issues')}
      className="flex flex-col bg-background lg:flex-1 lg:min-h-0"
    >
      {/* Header: title + tab switcher — stays fixed on desktop */}
      <div className="px-4 pt-6 pb-4 md:px-6 lg:px-8 lg:border-b lg:bg-background/80 lg:backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Internal Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                CassetteTeam operations &middot; User management &middot; Issue intake
              </p>
            </div>
          </div>
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
              {usersResponse && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[1.25rem] px-1 text-[10px]">
                  {usersResponse.totalItems}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Issues
              {issuesResponse && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-[1.25rem] px-1 text-[10px]">
                  {issuesResponse.totalItems}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>
      </div>

      {/* Content: only this area scrolls on desktop */}
      <div className="lg:flex-1 lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 py-6">
          <TabsContent value="users">
            <UsersTab
              search={userSearch}
              onSearchChange={handleUserSearchChange}
              accountTypeFilter={userAccountTypeFilter}
              onAccountTypeFilterChange={handleUserAccountTypeFilterChange}
              onboardedFilter={userOnboardedFilter}
              onOnboardedFilterChange={handleUserOnboardedFilterChange}
              usersResponse={usersResponse}
              usersLoading={usersLoading}
              usersError={usersError}
              usersPage={usersPage}
              onPageChange={setUsersPage}
              onRefresh={() => void loadUsers()}
              onExportCsv={() => void handleExportCsv()}
              downloadingCsv={downloadingCsv}
              selectedUser={selectedUser}
              selectedUserLoading={selectedUserLoading}
              selectedUserId={selectedUser?.userId ?? null}
              onSelectUser={(u) => void handleSelectUser(u)}
              selectedUserAccountType={selectedUserAccountType}
              actorCanAssignVerified={actorCanAssignVerified}
              targetAccountType={targetAccountType}
              onTargetAccountTypeChange={setTargetAccountType}
              targetCanAssignVerified={targetCanAssignVerified}
              onTargetCanAssignVerifiedChange={setTargetCanAssignVerified}
              accountTypeReason={accountTypeReason}
              onReasonChange={setAccountTypeReason}
              updatingAccountType={updatingAccountType}
              onUpdateAccountType={() => void handleUpdateInternalAccess()}
              auditEntries={selectedUserAudit}
              auditLoading={selectedUserAuditLoading}
            />
          </TabsContent>

          <TabsContent value="issues">
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
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
