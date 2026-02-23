'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { UserBio, ConnectedService, PlatformPreferenceInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
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
  return (
    <div className="text-card-foreground p-3 sm:p-4 lg:bg-transparent lg:p-0">
      <div className="flex flex-col gap-3 bg-transparent p-4 lg:p-0 rounded-lg lg:rounded-none">
        {/* Top Row: Avatar + User Info */}
        <div className="flex items-start gap-4 lg:gap-6">
          {/* Avatar */}
          <Avatar className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 border-2 border-border/20 flex-shrink-0">
            <AvatarImage
              src={userBio.avatarUrl}
              alt={`@${userBio.username}`}
            />
            <AvatarFallback className="bg-muted text-muted-foreground text-xl lg:text-2xl">
              {userBio.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* User Info */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold tracking-tight text-card-foreground truncate text-lg sm:text-xl md:text-2xl lg:text-3xl">
                {userBio.displayName || userBio.username}
              </span>
              <VerificationBadge
                accountType={userBio.accountType}
                size="md"
              />
              {isCurrentUser && (
                <Link href={`/profile/${userBio.username}/edit`} className="hover:scale-105 transition-transform flex-shrink-0">
                  <Image
                    src="/images/ic_edit.png"
                    alt="Edit"
                    width={24}
                    height={24}
                    className="w-5 h-5 sm:w-6 sm:h-6 opacity-80 hover:opacity-100"
                  />
                </Link>
              )}
            </div>

            <span className="leading-none text-muted-foreground mb-2 text-sm sm:text-base lg:text-lg">
              @{userBio.username}
            </span>
          </div>
        </div>

        {/* Bio */}
        {userBio.bio && (
          <p className="text-card-foreground/90 mb-3 text-sm sm:text-base lg:text-lg line-clamp-3 sm:line-clamp-none">
            {userBio.bio}
          </p>
        )}

        {/* Connected Services / Platform Preferences */}
        <div className="flex items-center mb-4">
          <ConnectedServices
            services={userBio.connectedServices}
            platformPreferences={userBio.platformPreferences}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 lg:flex-col lg:gap-4">
          <Button
            onClick={onShare}
            className="rounded-xl gap-2 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm lg:h-12 lg:px-6 lg:text-base"
          >
            <Image
              src="/images/ic_share.png"
              alt="Share"
              width={16}
              height={16}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
            />
            <span>Share Profile</span>
          </Button>

          {isCurrentUser && onAddMusic && (
            <Button
              variant="outline"
              onClick={onAddMusic}
              className="rounded-xl gap-2 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm lg:h-12 lg:px-6 lg:text-base"
            >
              <Image
                src="/images/ic_music.png"
                alt="Add Music"
                width={16}
                height={16}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
              />
              <span>Add Music</span>
            </Button>
          )}

          {isCurrentUser && isCassetteInternalAccount(userBio.accountType) && (
            <Button
              variant="outline"
              asChild
              className="rounded-xl gap-2 h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm lg:h-12 lg:px-6 lg:text-base"
            >
              <Link href="/internal">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

  const getServiceIcon = (serviceType: string) => {
    const normalized = normalize(serviceType);
    const iconMap: Record<string, string> = {
      'spotify': '/images/spotify_logo_colored.png',
      'applemusic': '/images/apple_music_logo_colored.png',
      'apple': '/images/apple_music_logo_colored.png',
      'youtube': '/images/social_images/ic_yt_music.png',
      'tidal': '/images/social_images/ic_tidal.png',
      'deezer': '/images/deezer_logo_colored.png',
    };

    return iconMap[normalized] || '/images/spotify_logo_colored.png';
  };

  const getServiceColor = (serviceType: string) => {
    const normalized = normalize(serviceType);
    const colorMap: Record<string, string> = {
      'spotify': 'bg-platform-spotify/20 border-platform-spotify/50',
      'applemusic': 'bg-platform-apple-music/20 border-platform-apple-music/50',
      'apple': 'bg-platform-apple-music/20 border-platform-apple-music/50',
      'youtube': 'bg-platform-youtube/20 border-platform-youtube/50',
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
      displayItems.push({ type: service.serviceType, key: `service-${service.serviceType}-${index}` });
    });
  }

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto max-w-full">
      {displayItems.map((item) => (
        <div
          key={item.key}
          className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg p-1.5 ${getServiceColor(item.type)} border`}
        >
          <Image
            src={getServiceIcon(item.type)}
            alt={item.type}
            width={28}
            height={28}
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}
