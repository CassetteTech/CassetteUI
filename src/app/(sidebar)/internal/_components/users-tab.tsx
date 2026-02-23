'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { InternalUserSummary, InternalUserDetail, InternalAccountTypeAuditEntry, InternalUsersResponse } from '@/types';
import type { normalizeAccountType } from './internal-utils';
import { UsersFilterBar } from './users-filter-bar';
import { UsersTable } from './users-table';
import { DataTablePagination } from './data-table-pagination';
import { ErrorState } from './error-state';
import { UserDetailPanel } from './user-detail-panel';
import { AuditLogTimeline } from './audit-log-timeline';

interface UsersTabProps {
  // Filter state
  search: string;
  onSearchChange: (value: string) => void;
  accountTypeFilter: string;
  onAccountTypeFilterChange: (value: string) => void;
  onboardedFilter: string;
  onOnboardedFilterChange: (value: string) => void;

  // Table state
  usersResponse: InternalUsersResponse | null;
  usersLoading: boolean;
  usersError: string | null;
  usersPage: number;
  onPageChange: (page: number) => void;

  // Actions
  onRefresh: () => void;
  onExportCsv: () => void;
  downloadingCsv: boolean;

  // Selection
  selectedUser: InternalUserDetail | null;
  selectedUserLoading: boolean;
  selectedUserId: string | null;
  onSelectUser: (user: InternalUserSummary) => void;

  // Account type controls
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

  // Audit log
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
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      {/* Master: table & filters */}
      <div className="min-w-0 flex-1">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Users</CardTitle>
            <CardDescription>Search, inspect profiles, assign roles, and export CSV.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsersFilterBar
              search={search}
              onSearchChange={onSearchChange}
              accountTypeFilter={accountTypeFilter}
              onAccountTypeFilterChange={onAccountTypeFilterChange}
              onboardedFilter={onboardedFilter}
              onOnboardedFilterChange={onOnboardedFilterChange}
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
