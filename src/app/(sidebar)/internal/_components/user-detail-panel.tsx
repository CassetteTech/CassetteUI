'use client';

import { useState } from 'react';
import { User, Copy, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { InternalUserDetail } from '@/types';
import { normalizeAccountType, formatDate, accountTypeBadgeVariant, accountTypeBadgeClassName } from './internal-utils';
import { UserAccountTypeControls } from './user-account-type-controls';
import { EmptyState } from './empty-state';

interface UserDetailPanelProps {
  user: InternalUserDetail | null;
  isLoading: boolean;
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
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
      </div>
    </div>
  );
}

export function UserDetailPanel({
  user,
  isLoading,
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
}: UserDetailPanelProps) {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">User Detail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <DetailSkeleton />
        ) : user ? (
          <>
            {/* User Header: Avatar + Identity */}
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.username} />}
                <AvatarFallback className="text-base font-medium">
                  {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{user.displayName || user.username}</p>
                  <Badge variant={accountTypeBadgeVariant(selectedUserAccountType)} className={`shrink-0 text-xs ${accountTypeBadgeClassName(selectedUserAccountType)}`}>
                    {selectedUserAccountType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
              </div>
            </div>

            <Separator />

            {/* Copyable User ID */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground shrink-0">User ID</span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-mono text-[11px] truncate">{user.userId}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => void handleCopyId(user.userId)}
                >
                  {copiedId ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Onboarded</p>
                <Badge variant={user.isOnboarded ? 'default' : 'outline'} className={user.isOnboarded ? 'bg-success text-white' : ''}>
                  {user.isOnboarded ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Can Assign Verified</p>
                <Badge variant={user.canAssignVerified ? 'default' : 'outline'}>
                  {user.canAssignVerified ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Joined</p>
                <p className="text-xs font-medium">{formatDate(user.joinDate)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Services</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium">{user.connectedServices.length}</span>
                  {user.connectedServices.map((svc) => (
                    <Badge key={svc.serviceType} variant="outline" className="text-[10px] px-1.5 py-0">
                      {svc.serviceType}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Account Type Controls */}
            {actorCanAssignVerified ? (
              <>
                <Separator />
                <UserAccountTypeControls
                  currentType={selectedUserAccountType}
                  currentCanAssignVerified={Boolean(user.canAssignVerified)}
                  targetType={targetAccountType}
                  onTargetTypeChange={onTargetAccountTypeChange}
                  targetCanAssignVerified={targetCanAssignVerified}
                  onTargetCanAssignVerifiedChange={onTargetCanAssignVerifiedChange}
                  accountTypeReason={accountTypeReason}
                  onReasonChange={onReasonChange}
                  updatingAccountType={updatingAccountType}
                  onApplyChanges={onUpdateAccountType}
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Your account does not have CanAssignVerified permission.
              </p>
            )}
          </>
        ) : (
          <EmptyState icon={User} title="No user selected" description="Select a user from the table to view details." />
        )}
      </CardContent>
    </Card>
  );
}
