'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MusicConnectionsStatus } from '@/components/features/music/music-connections-status';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { VerificationBadge } from '@/components/ui/verification-badge';
import type { UserBio, AuthUser, ConnectedService, AccountType } from '@/types';

interface SidebarProfileCardProps {
  /** User data to display - supports both UserBio (from profile API) and AuthUser (from auth store) */
  user: UserBio | AuthUser;
  /** Whether this is the current logged-in user's own profile */
  isCurrentUser?: boolean;
  className?: string;
}

/**
 * Get the avatar URL from either UserBio or AuthUser
 */
function getAvatarUrl(user: UserBio | AuthUser): string | undefined {
  if ('avatarUrl' in user) {
    return user.avatarUrl;
  }
  if ('profilePicture' in user) {
    return user.profilePicture;
  }
  return undefined;
}

/**
 * Get connected services from either UserBio or AuthUser
 */
function getConnectedServices(user: UserBio | AuthUser): ConnectedService[] {
  return user.connectedServices ?? [];
}

/**
 * Get account type from either UserBio or AuthUser
 * Returns raw value (number or string) to be normalized by VerificationBadge
 */
function getAccountType(user: UserBio | AuthUser): AccountType | number | undefined {
  return user.accountType;
}

export function SidebarProfileCard({
  user,
  isCurrentUser: _isCurrentUser = false,
  className = '',
}: SidebarProfileCardProps) {
  // _isCurrentUser is available for future use (e.g., showing edit indicator)
  void _isCurrentUser;

  const avatarUrl = getAvatarUrl(user);
  const connectedServices = getConnectedServices(user);
  const displayName = user.displayName || user.username;
  const bio = user.bio || '';
  const initial = user.username?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className={`mx-2 p-4 rounded-xl bg-card/50 border border-border/30 transition-colors hover:bg-card/70 min-h-[156px] ${className}`}>
      <div className="flex flex-col gap-3">
        {/* Top row: Avatar left, Connected services top right */}
        <div className="flex items-start justify-between">
          <Avatar className="h-14 w-14 border-2 border-border/30 ring-2 ring-primary/10 shadow-sm flex-shrink-0">
            <AvatarImage src={avatarUrl} alt={`@${user.username}`} />
            <AvatarFallback className="bg-primary text-white font-atkinson font-bold text-lg">
              {initial}
            </AvatarFallback>
          </Avatar>

          {/* Connected services - top right */}
          <MusicConnectionsStatus
            variant="sidebar-enhanced"
            connectedServicesOverride={connectedServices}
          />
        </div>

        {/* Name + username - left aligned */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-base text-foreground truncate leading-tight">
              {displayName}
            </p>
            <VerificationBadge accountType={getAccountType(user)} size="sm" />
          </div>
          <p className="text-sm text-muted-foreground leading-none">
            @{user.username}
          </p>
        </div>

        {/* Bio with tooltip for long text - left aligned */}
        {bio && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed cursor-default">
                {bio}
              </p>
            </TooltipTrigger>
            {bio.length > 80 && (
              <TooltipContent side="bottom" className="max-w-[280px] text-sm">
                {bio}
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for SidebarProfileCard
 */
export function SidebarProfileCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`mx-2 p-4 rounded-xl bg-card/50 border border-border/30 min-h-[156px] ${className}`}>
      <div className="flex flex-col gap-3">
        {/* Top row: Avatar left, services top right */}
        <div className="flex items-start justify-between">
          <div className="h-14 w-14 rounded-full bg-muted animate-pulse flex-shrink-0" />
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-muted rounded-md animate-pulse" />
            <div className="w-6 h-6 bg-muted rounded-md animate-pulse" />
          </div>
        </div>

        {/* Name + username skeleton - left aligned */}
        <div className="space-y-1.5">
          <div className="h-5 w-28 bg-muted rounded animate-pulse" />
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>

        {/* Bio skeleton - left aligned */}
        <div className="space-y-1">
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
