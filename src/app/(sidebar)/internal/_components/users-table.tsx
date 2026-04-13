'use client';

import { Users } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { InternalUserSummary } from '@/types';
import { normalizeAccountType, formatDate, accountTypeBadgeVariant, accountTypeBadgeClassName } from './internal-utils';
import { UsersTableSkeleton, UsersCardSkeleton } from './users-table-skeleton';
import { EmptyState } from './empty-state';

interface UsersTableProps {
  users: InternalUserSummary[];
  isLoading: boolean;
  selectedUserId: string | null;
  onSelectUser: (user: InternalUserSummary) => void;
}

export function UsersTable({ users, isLoading, selectedUserId, onSelectUser }: UsersTableProps) {
  if (isLoading) {
    return (
      <>
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Username</TableHead>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="whitespace-nowrap">Type</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Joined</TableHead>
                <TableHead className="whitespace-nowrap">Last Online</TableHead>
                <TableHead className="whitespace-nowrap text-right">Services</TableHead>
                <TableHead className="whitespace-nowrap text-right">Posts</TableHead>
                <TableHead className="whitespace-nowrap text-right">Likes</TableHead>
                <TableHead className="whitespace-nowrap text-right">30d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <UsersTableSkeleton />
            </TableBody>
          </Table>
        </div>
        <UsersCardSkeleton />
      </>
    );
  }

  if (!users.length) {
    return <EmptyState icon={Users} title="No users found" description="No users match your current filters." />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Username</TableHead>
              <TableHead className="whitespace-nowrap">Email</TableHead>
              <TableHead className="whitespace-nowrap">Type</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Joined</TableHead>
              <TableHead className="whitespace-nowrap">Last Online</TableHead>
              <TableHead className="whitespace-nowrap text-right">Services</TableHead>
              <TableHead className="whitespace-nowrap text-right">Posts</TableHead>
              <TableHead className="whitespace-nowrap text-right">Likes</TableHead>
              <TableHead className="whitespace-nowrap text-right">30d</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const accountType = normalizeAccountType(u.accountType as string | number);
              const isSelected = selectedUserId === u.userId;
              return (
                <TableRow
                  key={u.userId}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/5 ring-1 ring-inset ring-primary/20'
                      : 'hover:bg-muted/40'
                  }`}
                  onClick={() => onSelectUser(u)}
                >
                  <TableCell className="font-medium whitespace-nowrap">{u.username}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={accountTypeBadgeVariant(accountType)} className={`text-[11px] ${accountTypeBadgeClassName(accountType)}`}>
                      {accountType}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {u.isOnboarded ? (
                      <span className="inline-flex items-center gap-1 text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                        Onboarded
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(u.joinDate)}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(u.lastOnlineAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">{u.connectedServicesCount}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">{u.postCount ?? 0}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">{Number(u.likesReceivedAllTime ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums text-sm">{Number(u.likesReceived30d ?? 0).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 lg:hidden">
        {users.map((u) => {
          const accountType = normalizeAccountType(u.accountType as string | number);
          const isSelected = selectedUserId === u.userId;
          return (
            <div
              key={u.userId}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                isSelected
                  ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/10'
                  : 'hover:bg-muted/30 hover:border-border/80'
              }`}
              onClick={() => onSelectUser(u)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm truncate">{u.username}</span>
                <Badge variant={accountTypeBadgeVariant(accountType)} className={`text-[10px] shrink-0 ${accountTypeBadgeClassName(accountType)}`}>
                  {accountType}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${u.isOnboarded ? 'bg-[hsl(var(--success))]' : 'bg-muted-foreground/30'}`} />
                  {u.isOnboarded ? 'Onboarded' : 'Pending'}
                </span>
                <span>Last online {formatDate(u.lastOnlineAt)}</span>
                <span>{u.connectedServicesCount} services</span>
                <span>{u.postCount ?? 0} posts</span>
                <span>{Number(u.likesReceivedAllTime ?? 0).toLocaleString()} likes</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
