'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AvatarPreviewDialog } from '@/components/features/profile/avatar-preview-dialog';
import { MusicConnectionsStatus } from '@/components/features/music/music-connections-status';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { ProfileLinksRow } from '@/components/features/profile/profile-links';
import type { UserBio, AuthUser, ConnectedService, AccountType, PlatformPreferenceInfo } from '@/types';

interface SidebarProfileCardProps {
  /** User data to display - supports both UserBio (from profile API) and AuthUser (from auth store) */
  user: UserBio | AuthUser;
  /** Whether this is the current logged-in user's own profile */
  isCurrentUser?: boolean;
  className?: string;
  curatorGenres?: string[];
  curatorAbout?: string | null;
  curatorPlatforms?: string[];
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
 * Get platform preferences from UserBio (AuthUser doesn't have this yet)
 */
function getPlatformPreferences(user: UserBio | AuthUser): PlatformPreferenceInfo[] | undefined {
  if ('platformPreferences' in user) {
    return user.platformPreferences;
  }
  return undefined;
}

/**
 * Get account type from either UserBio or AuthUser
 * Returns raw value (number or string) to be normalized by VerificationBadge
 */
function getAccountType(user: UserBio | AuthUser): AccountType | number | undefined {
  return user.accountType;
}

/**
 * Get profile links from UserBio (AuthUser doesn't include this field).
 */
function getProfileLinks(user: UserBio | AuthUser): string[] | undefined {
  if ('profileLinks' in user) {
    return user.profileLinks;
  }
  return undefined;
}

/**
 * Get total likes received from UserBio (AuthUser doesn't include this field).
 */
function getTotalLikesReceived(user: UserBio | AuthUser): number | undefined {
  if ('totalLikesReceived' in user && typeof user.totalLikesReceived === 'number') {
    return user.totalLikesReceived;
  }
  return undefined;
}

export function SidebarProfileCard({
  user,
  isCurrentUser = false,
  className = '',
  curatorGenres,
  curatorAbout,
  curatorPlatforms,
}: SidebarProfileCardProps) {
  const avatarUrl = getAvatarUrl(user);
  const connectedServices = getConnectedServices(user);
  const platformPreferences = getPlatformPreferences(user);
  const displayName = user.displayName || user.username;
  const bio = user.bio || '';
  const initial = user.username?.charAt(0)?.toUpperCase() || 'U';
  const totalLikesReceived = getTotalLikesReceived(user);
  const links = getProfileLinks(user) ?? [];
  const curatorInterests = [...new Set([
    ...(curatorGenres ?? []),
    ...(curatorPlatforms ?? []),
  ])];

  const hasDetails = Boolean(bio || curatorAbout) || curatorInterests.length > 0 || links.length > 0;

  // Photo-album card: the portrait fills the top edge to edge, a ruled strip
  // carries the name and handle with the service marks where the album dots
  // would sit, and the bio copy hangs below.
  return (
    <article className={`mx-2 card-ink overflow-hidden ${className}`}>
      <AvatarPreviewDialog
        avatarUrl={avatarUrl}
        username={user.username}
        displayName={user.displayName ?? undefined}
        isCurrentUser={isCurrentUser}
      >
        <button
          type="button"
          aria-label={`View ${displayName}'s profile picture`}
          className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring hover:opacity-90 transition-opacity"
        >
          <Avatar className="aspect-square h-auto w-full rounded-none bg-muted">
            <AvatarImage src={avatarUrl} alt={`@${user.username}`} className="object-cover" />
            <AvatarFallback className="rounded-none bg-primary font-teko text-6xl font-bold text-white">
              {initial}
            </AvatarFallback>
          </Avatar>
        </button>
      </AvatarPreviewDialog>

      <div className="flex items-center justify-between gap-3 border-t border-border/70 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold leading-tight text-foreground">{displayName}</p>
            <VerificationBadge accountType={getAccountType(user)} size="sm" />
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            @{user.username}
            {(totalLikesReceived ?? 0) > 0 && ` · ${(totalLikesReceived ?? 0).toLocaleString()} ${totalLikesReceived === 1 ? 'like' : 'likes'}`}
          </p>
        </div>
        <MusicConnectionsStatus
          variant="sidebar-enhanced"
          className="shrink-0"
          platformPreferencesOverride={platformPreferences}
          connectedServicesOverride={connectedServices}
        />
      </div>

      {hasDetails && (
        <div className="space-y-2.5 border-t border-border/70 px-4 py-3">
          {bio && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="line-clamp-3 cursor-default text-xs leading-relaxed text-muted-foreground">{bio}</p>
              </TooltipTrigger>
              {bio.length > 100 && (
                <TooltipContent side="bottom" className="max-w-[280px] text-sm">{bio}</TooltipContent>
              )}
            </Tooltip>
          )}
          {curatorAbout && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="line-clamp-3 cursor-default text-xs leading-relaxed text-muted-foreground">{curatorAbout}</p>
              </TooltipTrigger>
              {curatorAbout.length > 120 && (
                <TooltipContent side="bottom" className="max-w-[280px] whitespace-pre-wrap text-sm">{curatorAbout}</TooltipContent>
              )}
            </Tooltip>
          )}
          {curatorInterests.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Curator interests">
              {curatorInterests.map((interest) => (
                <Badge key={interest} variant="outline" className="text-[10px]">{interest}</Badge>
              ))}
            </div>
          )}
          <ProfileLinksRow links={links} />
        </div>
      )}
    </article>
  );
}

/**
 * Skeleton loading state for SidebarProfileCard
 */
export function SidebarProfileCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`mx-2 card-ink overflow-hidden ${className}`}>
      <div className="aspect-square w-full bg-muted animate-pulse" />
      <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-2.5 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-6 w-6 bg-muted rounded-md animate-pulse" />
      </div>
    </div>
  );
}
