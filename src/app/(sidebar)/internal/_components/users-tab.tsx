'use client';

import { Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InternalUserSummary, InternalUserDetail, InternalAccountTypeAuditEntry, InternalUsersResponse } from '@/types';
import type { normalizeAccountType } from './internal-utils';
import { UsersFilterBar } from './users-filter-bar';
import { UsersTable } from './users-table';
import { DataTablePagination } from './data-table-pagination';
import { ErrorState } from './error-state';
import { UserDetailPanel } from './user-detail-panel';
import { AuditLogTimeline } from './audit-log-timeline';

interface UsersTabProps {
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
  usersResponse: InternalUsersResponse | null;
  usersLoading: boolean;
  usersError: string | null;
  usersPage: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onExportCsv: () => void;
  downloadingCsv: boolean;
  selectedUser: InternalUserDetail | null;
  selectedUserLoading: boolean;
  selectedUserId: string | null;
  onSelectUser: (user: InternalUserSummary) => void;
  selectedUserAccountType: ReturnType<typeof normalizeAccountType>;
  actorCanAssignVerified: boolean;
  targetAccountType: 'Regular' | 'Verified' | 'CassetteTeam';
  onTargetAccountTypeChange: (value: 'Regular' | 'Verified' | 'CassetteTeam') => void;
  targetCanAssignVerified: boolean;
  onTargetCanAssignVerifiedChange: (value: boolean) => void;
  accountTypeReason: string;
  onReasonChange: (reason: string) => void;
  updatingAccountType: boolean;
  onUpdateAccountType: () => void;
  auditEntries: InternalAccountTypeAuditEntry[];
  auditLoading: boolean;
}

export function UsersTab({
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
  usersResponse,
  usersLoading,
  usersError,
  usersPage,
  onPageChange,
  onRefresh,
  onExportCsv,
  downloadingCsv,
  selectedUser,
  selectedUserLoading,
  selectedUserId,
  onSelectUser,
  selectedUserAccountType,
  actorCanAssignVerified,
  targetAccountType,
  onTargetAccountTypeChange,
  targetCanAssignVerified,
  onTargetCanAssignVerifiedChange,
  accountTypeReason,
  onReasonChange,
  updatingAccountType,
  onUpdateAccountType,
  auditEntries,
  auditLoading,
}: UsersTabProps) {
  const totalUsers = usersResponse?.totalItems ?? 0;

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      {/* Master: table & filters */}
      <div className="min-w-0 flex-1">
        <Card>
          <div className="px-6 pt-5 pb-1">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-base font-semibold">Users</h2>
              {totalUsers > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                  {totalUsers.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Search, inspect profiles, assign roles, and export data.
            </p>
          </div>
          <CardContent className="space-y-4 pt-0">
            <UsersFilterBar
              search={search}
              onSearchChange={onSearchChange}
              accountTypeFilter={accountTypeFilter}
              onAccountTypeFilterChange={onAccountTypeFilterChange}
              onboardedFilter={onboardedFilter}
              onOnboardedFilterChange={onOnboardedFilterChange}
              sortBy={sortBy}
              onSortByChange={onSortByChange}
              sortDirection={sortDirection}
              onSortDirectionChange={onSortDirectionChange}
              isLoading={usersLoading}
              downloadingCsv={downloadingCsv}
              onRefresh={onRefresh}
              onExportCsv={onExportCsv}
            />

            {usersError && <ErrorState message={usersError} onRetry={onRefresh} />}

            <UsersTable
              users={usersResponse?.items ?? []}
              isLoading={usersLoading}
              selectedUserId={selectedUserId}
              onSelectUser={onSelectUser}
            />

            <DataTablePagination
              page={usersResponse?.page ?? usersPage}
              totalPages={usersResponse?.totalPages ?? 1}
              totalItems={usersResponse?.totalItems ?? 0}
              itemLabel="users"
              isLoading={usersLoading}
              onPageChange={onPageChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Detail: sticky side panel */}
      <div className="space-y-4 xl:w-[400px] xl:shrink-0 xl:sticky xl:top-6 xl:self-start xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto no-scrollbar">
        <UserDetailPanel
          user={selectedUser}
          isLoading={selectedUserLoading}
          selectedUserAccountType={selectedUserAccountType}
          actorCanAssignVerified={actorCanAssignVerified}
          targetAccountType={targetAccountType}
          onTargetAccountTypeChange={onTargetAccountTypeChange}
          targetCanAssignVerified={targetCanAssignVerified}
          onTargetCanAssignVerifiedChange={onTargetCanAssignVerifiedChange}
          accountTypeReason={accountTypeReason}
          onReasonChange={onReasonChange}
          updatingAccountType={updatingAccountType}
          onUpdateAccountType={onUpdateAccountType}
        />
        <AuditLogTimeline
          entries={auditEntries}
          isLoading={auditLoading}
        />
      </div>
    </div>
  );
}
