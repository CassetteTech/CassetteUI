'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/use-debounce';
import { apiService, ApiError } from '@/services/api';
import {
  InternalAccountTypeAuditEntry,
  InternalUserDetail,
  InternalUserSummary,
  InternalUsersResponse,
} from '@/types';
import { SectionHeader } from './kit';
import { normalizeAccountType, PAGE_SIZE } from './internal-utils';
import { UsersTab } from './users-tab';

/**
 * Owns all Users state — lifted verbatim from the old InternalDashboardShell so
 * behaviour is identical. The request-dedup ref, post-count hydration, and
 * loadUsers stay together in one component instance so the requestId guard
 * remains coherent. Renders the presentational <UsersTab/>.
 */
export function UsersContainer() {
  const usersRequestIdRef = useRef(0);

  const [userSearch, setUserSearch] = useState('');
  const [userAccountTypeFilter, setUserAccountTypeFilter] = useState('');
  const [userOnboardedFilter, setUserOnboardedFilter] = useState('');
  const [userSortBy, setUserSortBy] = useState<'joinDate' | 'lastOnlineAt' | 'likesAllTime' | 'likes30d'>('likesAllTime');
  const [userSortDirection, setUserSortDirection] = useState<'asc' | 'desc'>('desc');
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

  const debouncedUserSearch = useDebounce(userSearch, 300);
  const actorCanAssignVerified = usersResponse?.actorCanAssignVerified ?? false;

  const selectedUserAccountType = useMemo(
    () => normalizeAccountType(selectedUser?.accountType as string | number | undefined),
    [selectedUser?.accountType]
  );

  const hydratePostCountsIfNeeded = useCallback(async (users: InternalUserSummary[], requestId: number) => {
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
          if (Number.isFinite(detailCount)) { counts.set(user.userId, detailCount); continue; }
          const fallbackCount = await apiService.getUserPostCount(user.userId);
          counts.set(user.userId, fallbackCount);
        } catch { counts.set(user.userId, 0); }
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
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    const requestId = usersRequestIdRef.current + 1;
    usersRequestIdRef.current = requestId;
    try {
      const response = await apiService.getInternalUsers({
        q: debouncedUserSearch || undefined,
        accountType: userAccountTypeFilter || undefined,
        isOnboarded: userOnboardedFilter || undefined,
        sortBy: userSortBy,
        sortDirection: userSortDirection,
        page: usersPage,
        pageSize: PAGE_SIZE,
      });
      const normalizedItems = response.items.map((item) => {
        const parsedPostCount = Number(item.postCount);
        const parsedLikesAllTime = Number(item.likesReceivedAllTime);
        const parsedLikes30d = Number(item.likesReceived30d);
        return {
          ...item,
          postCount: Number.isFinite(parsedPostCount) ? parsedPostCount : 0,
          likesReceivedAllTime: Number.isFinite(parsedLikesAllTime) ? parsedLikesAllTime : 0,
          likesReceived30d: Number.isFinite(parsedLikes30d) ? parsedLikes30d : 0,
        };
      });
      setUsersResponse({ ...response, items: normalizedItems });
      const allZero = normalizedItems.every((item) => (item.postCount ?? 0) === 0);
      if (allZero) void hydratePostCountsIfNeeded(normalizedItems, requestId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load users';
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  }, [debouncedUserSearch, userAccountTypeFilter, userOnboardedFilter, userSortBy, userSortDirection, usersPage, hydratePostCountsIfNeeded]);

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
      toast.error(error instanceof Error ? error.message : 'Failed to load user details');
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
      toast.error(error instanceof Error ? error.message : 'Failed to load audit log');
    } finally {
      setSelectedUserAuditLoading(false);
    }
  };

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const handleSelectUser = async (summary: InternalUserSummary) => {
    setAccountTypeReason('');
    await Promise.all([loadUserDetails(summary.userId), loadUserAudit(summary.userId)]);
  };

  const handleUpdateInternalAccess = async () => {
    if (!selectedUser) return;
    const reason = accountTypeReason.trim();
    if (!reason) { toast.error('A reason is required for internal access changes.'); return; }
    const normalizedCurrentType = normalizeAccountType(selectedUser.accountType as string | number);
    const currentType = normalizedCurrentType === 'Regular' || normalizedCurrentType === 'Verified' || normalizedCurrentType === 'CassetteTeam' ? normalizedCurrentType : 'Unknown';
    const effectiveTargetCanAssign = targetAccountType === 'CassetteTeam' ? targetCanAssignVerified : false;
    const effectiveCurrentCanAssign = normalizedCurrentType === 'CassetteTeam' ? Boolean(selectedUser.canAssignVerified) : false;
    if (currentType === targetAccountType && effectiveCurrentCanAssign === effectiveTargetCanAssign) { toast.error('No changes to apply.'); return; }
    setUpdatingAccountType(true);
    try {
      await apiService.updateInternalUserInternalAccess(selectedUser.userId, { accountType: targetAccountType, canAssignVerified: effectiveTargetCanAssign, reason });
      toast.success('Internal access updated.');
      setAccountTypeReason('');
      await Promise.all([loadUsers(), loadUserDetails(selectedUser.userId), loadUserAudit(selectedUser.userId)]);
    } catch (error) {
      if (error instanceof ApiError && error.message) toast.error(error.message);
      else toast.error('Failed to update account type.');
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
        sortBy: userSortBy,
        sortDirection: userSortDirection,
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
      toast.error(error instanceof Error ? error.message : 'Failed to export CSV');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleUserSearchChange = (value: string) => { setUserSearch(value); setUsersPage(1); };
  const handleUserAccountTypeFilterChange = (value: string) => { setUserAccountTypeFilter(value); setUsersPage(1); };
  const handleUserOnboardedFilterChange = (value: string) => { setUserOnboardedFilter(value); setUsersPage(1); };
  const handleUserSortByChange = (value: 'joinDate' | 'lastOnlineAt' | 'likesAllTime' | 'likes30d') => { setUserSortBy(value); setUsersPage(1); };
  const handleUserSortDirectionChange = (value: 'asc' | 'desc') => { setUserSortDirection(value); setUsersPage(1); };

  return (
    <div className="space-y-4">
      <SectionHeader section="Growth" title="Users" count={usersResponse?.totalItems} />
      <UsersTab
        search={userSearch}
        onSearchChange={handleUserSearchChange}
        accountTypeFilter={userAccountTypeFilter}
        onAccountTypeFilterChange={handleUserAccountTypeFilterChange}
        onboardedFilter={userOnboardedFilter}
        onOnboardedFilterChange={handleUserOnboardedFilterChange}
        sortBy={userSortBy}
        onSortByChange={handleUserSortByChange}
        sortDirection={userSortDirection}
        onSortDirectionChange={handleUserSortDirectionChange}
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
    </div>
  );
}
