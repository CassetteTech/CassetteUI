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
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Account Type</TableHead>
                <TableHead>Onboarded</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead>Posts</TableHead>
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
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead>Onboarded</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Connected</TableHead>
              <TableHead>Posts</TableHead>
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
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={accountTypeBadgeVariant(accountType)} className={accountTypeBadgeClassName(accountType)}>{accountType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.isOnboarded ? 'default' : 'outline'} className={u.isOnboarded ? 'bg-success text-white' : ''}>
                      {u.isOnboarded ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(u.joinDate)}</TableCell>
                  <TableCell>{u.connectedServicesCount}</TableCell>
                  <TableCell>{u.postCount ?? 0}</TableCell>
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
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
