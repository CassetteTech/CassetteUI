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
        {/* Desktop skeleton */}
        <div className="hidden lg:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Username</TableHead>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="whitespace-nowrap">Account Type</TableHead>
                <TableHead className="whitespace-nowrap">Onboarded</TableHead>
                <TableHead className="whitespace-nowrap">Join Date</TableHead>
                <TableHead className="whitespace-nowrap">Connected</TableHead>
                <TableHead className="whitespace-nowrap">Posts</TableHead>
                <TableHead className="whitespace-nowrap">Likes (All)</TableHead>
                <TableHead className="whitespace-nowrap">Likes (30d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <UsersTableSkeleton />
            </TableBody>
          </Table>
        </div>
        {/* Mobile skeleton */}
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
              <TableHead className="whitespace-nowrap">Account Type</TableHead>
              <TableHead className="whitespace-nowrap">Onboarded</TableHead>
              <TableHead className="whitespace-nowrap">Join Date</TableHead>
              <TableHead className="whitespace-nowrap">Connected</TableHead>
              <TableHead className="whitespace-nowrap">Posts</TableHead>
              <TableHead className="whitespace-nowrap">Likes (All)</TableHead>
              <TableHead className="whitespace-nowrap">Likes (30d)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const accountType = normalizeAccountType(u.accountType as string | number);
              const isSelected = selectedUserId === u.userId;
              return (
                <TableRow
                  key={u.userId}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/40'}`}
                  onClick={() => onSelectUser(u)}
                >
                  <TableCell className="font-medium whitespace-nowrap">{u.username}</TableCell>
                  <TableCell className="whitespace-nowrap">{u.email}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={accountTypeBadgeVariant(accountType)} className={accountTypeBadgeClassName(accountType)}>{accountType}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={u.isOnboarded ? 'default' : 'outline'} className={u.isOnboarded ? 'bg-success text-white' : ''}>
                      {u.isOnboarded ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(u.joinDate)}</TableCell>
                  <TableCell className="whitespace-nowrap">{u.connectedServicesCount}</TableCell>
                  <TableCell className="whitespace-nowrap">{u.postCount ?? 0}</TableCell>
                  <TableCell className="whitespace-nowrap">{Number(u.likesReceivedAllTime ?? 0).toLocaleString()}</TableCell>
                  <TableCell className="whitespace-nowrap">{Number(u.likesReceived30d ?? 0).toLocaleString()}</TableCell>
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
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'}`}
              onClick={() => onSelectUser(u)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{u.username}</span>
                <Badge variant={accountTypeBadgeVariant(accountType)} className={`text-xs ${accountTypeBadgeClassName(accountType)}`}>{accountType}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{u.isOnboarded ? 'Onboarded' : 'Not onboarded'}</span>
                <span>{u.connectedServicesCount} services</span>
                <span>{u.postCount ?? 0} posts</span>
                <span>{Number(u.likesReceivedAllTime ?? 0).toLocaleString()} all-time likes</span>
                <span>{Number(u.likesReceived30d ?? 0).toLocaleString()} 30d likes</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
