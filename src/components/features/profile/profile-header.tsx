'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Settings, Shield } from 'lucide-react';
import { UserBio, ConnectedService, PlatformPreferenceInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { MusicConnectionsStatus } from '@/components/features/music/music-connections-status';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';

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
          <Avatar className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 border-2 border-border/20 flex-shrink-0">
            <AvatarImage
              src={userBio.avatarUrl}
              alt={`@${userBio.username}`}
            />
            <AvatarFallback className="bg-muted text-muted-foreground text-xl lg:text-2xl">
              {userBio.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold tracking-tight text-card-foreground truncate text-xl sm:text-2xl lg:text-3xl">
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
              <span className="leading-none text-muted-foreground text-sm sm:text-base lg:text-lg truncate min-w-0 flex-1">
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
            <span className="lg:hidden text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-card-foreground">{totalLikesReceived.toLocaleString()}</span>
              {' '}likes
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
        <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-semibold text-card-foreground">{totalLikesReceived.toLocaleString()}</span>
          <span>likes</span>
        </div>

        {/* Action Buttons — full-width primary on mobile, ≥40px tap target */}
        <div className="flex flex-row gap-2 sm:gap-3 lg:flex-col lg:gap-4">
          <Button
            onClick={onShare}
            className="rounded-xl gap-2 h-10 px-4 text-sm flex-1 min-w-0 lg:flex-none lg:w-full lg:h-12 lg:px-6 lg:text-base"
          >
            <Image
              src="/images/ic_share.png"
              alt="Share"
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span>Share Profile</span>
          </Button>

          {isCurrentUser && onAddMusic && (
            <Button
              variant="outline"
              onClick={onAddMusic}
              className="rounded-xl gap-2 h-10 px-4 text-sm flex-1 min-w-0 lg:flex-none lg:w-full lg:h-12 lg:px-6 lg:text-base"
            >
              <Image
                src="/images/ic_music.png"
                alt="Add Music"
                width={16}
                height={16}
                className="w-4 h-4 dark:invert"
              />
              <span>Add Music</span>
            </Button>
          )}

          {isCurrentUser && isCassetteInternalAccount(userBio.accountType) && (
            <Button
              variant="outline"
              asChild
              className="rounded-xl gap-2 h-10 px-4 text-sm flex-1 min-w-0 lg:flex-none lg:w-full lg:h-12 lg:px-6 lg:text-base"
            >
              <Link href="/internal">
                <Shield className="w-4 h-4" />
                <span>Internal</span>
              </Link>
            </Button>
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
  const normalize = (value: unknown) => (typeof value === 'string' ? value : value ? String(value) : '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const getServiceIcon = (serviceType: string): string | null => {
    const normalized = normalize(serviceType);
    const iconMap: Record<string, string> = {
      'spotify': '/images/spotify_logo_colored.png',
      'applemusic': '/images/apple_music_logo_colored.png',
      'apple': '/images/apple_music_logo_colored.png',
      'youtube': '/images/social_images/ic_yt_music.png',
      'youtubemusic': '/images/social_images/ic_yt_music.png',
      'tidal': '/images/social_images/ic_tidal.png',
      'deezer': '/images/deezer_logo_colored.png',
    };

    return iconMap[normalized] ?? null;
  };

  const getServiceIconClassName = (serviceType: string) => {
    const normalized = normalize(serviceType);

    if (normalized === 'applemusic' || normalized === 'apple') {
      return 'w-full h-full object-contain dark:invert';
    }

    return 'w-full h-full object-contain';
  };

  const getServiceColor = (serviceType: string) => {
    const normalized = normalize(serviceType);
    const colorMap: Record<string, string> = {
      'spotify': 'bg-platform-spotify/20 border-platform-spotify/50',
      'applemusic': 'bg-platform-apple-music/20 border-platform-apple-music/50',
      'apple': 'bg-platform-apple-music/20 border-platform-apple-music/50',
      'youtube': 'bg-platform-youtube/20 border-platform-youtube/50',
      'youtubemusic': 'bg-platform-youtube/20 border-platform-youtube/50',
      'tidal': 'bg-platform-tidal/20 border-platform-tidal/50',
      'deezer': 'bg-platform-deezer/20 border-platform-deezer/50',
    };

    return colorMap[normalized] || 'bg-muted/20 border-muted-foreground/50';
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
