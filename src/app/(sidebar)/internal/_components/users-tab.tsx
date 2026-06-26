'use client';

import { ArrowDown, ArrowUp, Download, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { InternalUserSummary, InternalUserDetail, InternalAccountTypeAuditEntry, InternalUsersResponse } from '@/types';
import { Panel, DataTable, Toolbar, SegmentedControl, StatusPill, Pagination, type Column, type Tone } from './kit';
import { normalizeAccountType, formatDate } from './internal-utils';
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

const ACCOUNT_TYPES = [
  { value: '', label: 'All' },
  { value: 'Regular', label: 'Regular' },
  { value: 'Verified', label: 'Verified' },
  { value: 'CassetteTeam', label: 'Team' },
] as const;

const ONBOARDED = [
  { value: '', label: 'All' },
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
] as const;

function typePill(type: ReturnType<typeof normalizeAccountType>) {
  const map: Record<string, { tone: Tone; label: string }> = {
    CassetteTeam: { tone: 'domain', label: 'Team' },
    Verified: { tone: 'info', label: 'Verified' },
    Regular: { tone: 'neutral', label: 'Regular' },
    Unknown: { tone: 'neutral', label: '—' },
  };
  const cfg = map[type] ?? map.Unknown;
  return <StatusPill tone={cfg.tone} label={cfg.label} dot={type !== 'Regular' && type !== 'Unknown'} />;
}

function Identity({ user }: { user: InternalUserSummary }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span
        className={`signal-dot ${user.isOnboarded ? 'text-[hsl(var(--success))]' : 'text-muted-foreground/40'}`}
        title={user.isOnboarded ? 'Onboarded' : 'Not onboarded'}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{user.username}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
      </span>
    </div>
  );
}

export function UsersTab(props: UsersTabProps) {
  const {
    search, onSearchChange, accountTypeFilter, onAccountTypeFilterChange,
    onboardedFilter, onOnboardedFilterChange, sortBy, onSortByChange,
    sortDirection, onSortDirectionChange, usersResponse, usersLoading, usersError,
    usersPage, onPageChange, onRefresh, onExportCsv, downloadingCsv,
    selectedUser, selectedUserLoading, selectedUserId, onSelectUser,
    selectedUserAccountType, actorCanAssignVerified, targetAccountType,
    onTargetAccountTypeChange, targetCanAssignVerified, onTargetCanAssignVerifiedChange,
    accountTypeReason, onReasonChange, updatingAccountType, onUpdateAccountType,
    auditEntries, auditLoading,
  } = props;

  const columns: Column<InternalUserSummary>[] = [
    { key: 'user', header: 'User', cell: (u) => <Identity user={u} /> },
    { key: 'type', header: 'Type', cell: (u) => typePill(normalizeAccountType(u.accountType as string | number)) },
    { key: 'likes', header: 'Likes', align: 'right', cell: (u) => Number(u.likesReceivedAllTime ?? 0).toLocaleString() },
    { key: 'posts', header: 'Posts', align: 'right', className: 'hidden md:table-cell', cell: (u) => u.postCount ?? 0 },
    { key: 'l30', header: '30d', align: 'right', className: 'hidden xl:table-cell', cell: (u) => Number(u.likesReceived30d ?? 0).toLocaleString() },
    { key: 'joined', header: 'Joined', align: 'right', className: 'hidden xl:table-cell', cell: (u) => <span className="text-muted-foreground">{formatDate(u.joinDate)}</span> },
  ];

  const renderMobile = (u: InternalUserSummary) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Identity user={u} />
        {typePill(normalizeAccountType(u.accountType as string | number))}
      </div>
      <div className="flex items-center gap-3 pl-4 font-mono text-[11px] tabular-nums text-muted-foreground">
        <span>{Number(u.likesReceivedAllTime ?? 0).toLocaleString()} likes</span>
        <span>{u.postCount ?? 0} posts</span>
        <span>{formatDate(u.joinDate)}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-3">
        <Toolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder="Search username, email, name…"
          filters={
            <>
              <SegmentedControl label="Type" value={accountTypeFilter} onChange={onAccountTypeFilterChange} options={ACCOUNT_TYPES} />
              <SegmentedControl label="Onboard" value={onboardedFilter} onChange={onOnboardedFilterChange} options={ONBOARDED} />
            </>
          }
          actions={
            <>
              <Select value={sortBy} onValueChange={(v: UsersTabProps['sortBy']) => onSortByChange(v)}>
                <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="likesAllTime">Likes (all)</SelectItem>
                  <SelectItem value="likes30d">Likes (30d)</SelectItem>
                  <SelectItem value="lastOnlineAt">Last online</SelectItem>
                  <SelectItem value="joinDate">Join date</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}>
                {sortDirection === 'desc' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={onRefresh} disabled={usersLoading}>
                <RefreshCw className={`h-3.5 w-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" className="h-8 gap-1.5" onClick={onExportCsv} disabled={downloadingCsv || usersLoading}>
                <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Export</span>
              </Button>
            </>
          }
        />

        <Panel bodyClassName="overflow-hidden rounded-b-lg">
          {usersError ? (
            <div className="px-3 py-10 text-center text-sm text-destructive">{usersError}</div>
          ) : (
            <DataTable
              columns={columns}
              rows={usersResponse?.items ?? []}
              rowKey={(u) => u.userId}
              onRowClick={onSelectUser}
              selectedKey={selectedUserId}
              isLoading={usersLoading}
              empty={{ icon: Users, title: 'No users', description: 'No users match these filters.' }}
              renderMobile={renderMobile}
            />
          )}
          <Pagination
            page={usersResponse?.page ?? usersPage}
            totalPages={usersResponse?.totalPages ?? 1}
            totalItems={usersResponse?.totalItems ?? 0}
            itemLabel="users"
            isLoading={usersLoading}
            onPageChange={onPageChange}
          />
        </Panel>
      </div>

      <div className="space-y-3 xl:w-[360px] xl:shrink-0 xl:sticky xl:top-2 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto no-scrollbar">
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
        <AuditLogTimeline entries={auditEntries} isLoading={auditLoading} />
      </div>
    </div>
  );
}
