'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Plus, Settings, Share2, Shield } from 'lucide-react';
import { UserBio, ConnectedService, PlatformPreferenceInfo } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { MusicConnectionsStatus } from '@/components/features/music/music-connections-status';
import { AvatarPreviewDialog } from '@/components/features/profile/avatar-preview-dialog';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';
import { getDisplayPlatformDefinition, isAppleMusicPlatform } from '@/lib/platforms';

interface ProfileHeaderProps {
  userBio: UserBio;
  isCurrentUser: boolean;
  onShare: () => void;
  onAddMusic?: () => void;
}

export function ProfileHeader({
  userBio,
  isCurrentUser,
  onShare,
  onAddMusic
}: ProfileHeaderProps) {
  const totalLikesReceived = Number(userBio.totalLikesReceived ?? 0);

  return (
    <div className="relative text-card-foreground px-4 pt-4 pb-3 sm:px-5 lg:p-0">
      {/* Mobile/tablet: settings gear anchored top-right, out of the identity line */}
      {isCurrentUser && (
        <Link
          href={`/profile/${userBio.username}/edit`}
          aria-label="Edit profile"
          className="lg:hidden absolute top-3 right-3 p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Settings className="w-5 h-5" />
        </Link>
      )}

      <div className="flex flex-col gap-3 lg:gap-4">
        {/* Top Row: Avatar + User Info */}
        <div className="flex items-center gap-4 lg:items-start lg:gap-6">
          {/* Avatar */}
          <AvatarPreviewDialog
            avatarUrl={userBio.avatarUrl}
            username={userBio.username}
            displayName={userBio.displayName}
            isCurrentUser={isCurrentUser}
          >
            <button
              type="button"
              aria-label={`View ${userBio.displayName || userBio.username}'s profile picture`}
              className="flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:opacity-90 transition-opacity"
            >
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 border-2 border-foreground/80">
                <AvatarImage
                  src={userBio.avatarUrl}
                  alt={`@${userBio.username}`}
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-xl lg:text-2xl">
                  {userBio.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </AvatarPreviewDialog>

          {/* User Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-teko font-bold leading-none text-card-foreground truncate text-3xl sm:text-4xl lg:text-5xl">
                {userBio.displayName || userBio.username}
              </span>
              <VerificationBadge
                accountType={userBio.accountType}
                size="md"
              />
              {/* Desktop keeps the gear inline with the name */}
              {isCurrentUser && (
                <Link href={`/profile/${userBio.username}/edit`} className="hidden lg:inline-flex hover:scale-105 transition-transform flex-shrink-0">
                  <Settings
                    aria-label="Edit profile"
                    className="w-6 h-6 opacity-80 hover:opacity-100"
                  />
                </Link>
              )}
            </div>

            {/* @username + connected-service icons on the right, same row */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="leading-none font-mono text-[11px] sm:text-xs uppercase tracking-[0.2em] text-muted-foreground truncate min-w-0 flex-1">
                @{userBio.username}
              </span>
              <div className="flex-shrink-0 lg:hidden">
                <MusicConnectionsStatus
                  variant="sidebar"
                  className="justify-end"
                  connectedServicesOverride={userBio.connectedServices}
                  platformPreferencesOverride={userBio.platformPreferences}
                />
              </div>
            </div>

            {/* Mobile likes stat on its own line — no fragile dot-separator, no wrapping */}
            <span className="lg:hidden font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              <span className="font-bold text-card-foreground">{totalLikesReceived.toLocaleString()}</span>
              {' '}{totalLikesReceived === 1 ? 'like' : 'likes'}
            </span>

            {/* Desktop keeps the services in the identity column below username */}
            <div className="hidden lg:block mt-1">
              <ConnectedServices
                services={userBio.connectedServices}
                platformPreferences={userBio.platformPreferences}
              />
            </div>
          </div>
        </div>

        {/* Bio — full text on mobile; only clamp when truly long to keep header compact */}
        {userBio.bio && (
          <p className="text-card-foreground/90 text-sm sm:text-base lg:text-lg whitespace-pre-wrap">
            {userBio.bio}
          </p>
        )}

        {/* Desktop-only likes row */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="font-bold text-card-foreground">{totalLikesReceived.toLocaleString()}</span>
          <span>{totalLikesReceived === 1 ? 'like' : 'likes'}</span>
        </div>

        {/* Action Buttons — editorial voice: mono labels, quiet chrome, ≥40px tap target */}
        <div className="flex flex-row gap-2 sm:gap-3 lg:flex-col lg:gap-3">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-10 flex-1 min-w-0 items-center justify-center gap-2 rounded-md bg-primary px-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground elev-1 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full lg:flex-none"
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">Share Profile</span>
          </button>

          {isCurrentUser && onAddMusic && (
            <button
              type="button"
              onClick={onAddMusic}
              className="inline-flex h-10 flex-1 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-foreground elev-1 transition-colors hover:border-foreground/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full lg:flex-none"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">Add Music</span>
            </button>
          )}

          {isCurrentUser && isCassetteInternalAccount(userBio.accountType) && (
            <Link
              href="/internal"
              className="inline-flex h-10 flex-1 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-foreground elev-1 transition-colors hover:border-foreground/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full lg:flex-none"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">Internal</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectedServices({
  services,
  platformPreferences,
}: {
  services: ConnectedService[];
  platformPreferences?: PlatformPreferenceInfo[];
}) {
  const getServiceIcon = (serviceType: string): string | null => {
    return getDisplayPlatformDefinition(serviceType)?.logoSrc ?? null;
  };

  const getServiceIconClassName = (serviceType: string) => {
    if (isAppleMusicPlatform(serviceType)) {
      return 'w-full h-full object-contain dark:invert';
    }

    return 'w-full h-full object-contain';
  };

  const getServiceColor = (serviceType: string) => {
    return getDisplayPlatformDefinition(serviceType)?.profileBadgeClassName || 'bg-muted/20 border-muted-foreground/50';
  };

  // Use platformPreferences if available, fall back to connectedServices
  const displayItems: Array<{ type: string; key: string }> = [];

  if (platformPreferences && platformPreferences.length > 0) {
    platformPreferences.forEach((pref, index) => {
      displayItems.push({ type: pref.platform, key: `pref-${pref.platform}-${index}` });
    });
  } else if (services && services.length > 0) {
    services.forEach((service, index) => {
      // API may return either { serviceType: string } objects or raw strings
      const type = typeof service === 'string' ? service : service?.serviceType;
      if (!type) return;
      displayItems.push({ type, key: `service-${type}-${index}` });
    });
  }

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className="flex w-max items-center gap-2">
      {displayItems.map((item) => {
        const iconSrc = getServiceIcon(item.type);
        if (!iconSrc) return null;
        return (
        <div
          key={item.key}
          className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg p-1.5 ${getServiceColor(item.type)} border`}
        >
          <Image
            src={iconSrc}
            alt={item.type}
            width={28}
            height={28}
            className={getServiceIconClassName(item.type)}
          />
        </div>
        );
      })}
    </div>
  );
}
