'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserBio, ConnectedService, PlatformPreferenceInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';

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
  // Responsive breakpoints matching Flutter design
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const isSmallScreen = screenWidth < 400;
  const isLargeScreen = screenWidth > 800;
  
  const avatarSize = isSmallScreen ? 'w-12 h-12' : isLargeScreen ? 'w-24 h-24 lg:w-32 lg:h-32' : 'w-16 h-16';
  const padding = isSmallScreen ? 'p-3' : isLargeScreen ? 'p-4' : 'p-3';
  
  return (
    <div className={`text-card-foreground ${padding} lg:bg-transparent lg:p-0`}>
      <div className="flex flex-col gap-3 bg-transparent p-4 lg:p-0 rounded-lg lg:rounded-none">
        {/* Top Row: Avatar + User Info */}
        <div className="flex items-start gap-4 lg:gap-6">
          {/* Avatar */}
          <Avatar className={`${avatarSize} border-2 border-border/20 flex-shrink-0`}>
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
              <span className={`font-semibold tracking-tight text-card-foreground truncate ${
                isSmallScreen ? 'text-lg' : isLargeScreen ? 'text-2xl lg:text-3xl' : 'text-xl'
              }`}>
                {userBio.displayName || userBio.username}
              </span>
              <VerificationBadge
                accountType={userBio.accountType}
                size={isSmallScreen ? 'sm' : isLargeScreen ? 'lg' : 'md'}
              />
              {isCurrentUser && (
                <Link href={`/profile/${userBio.username}/edit`} className="hover:scale-105 transition-transform flex-shrink-0">
                  <Image 
                    src="/images/ic_edit.png" 
                    alt="Edit" 
                    width={isSmallScreen ? 20 : 24} 
                    height={isSmallScreen ? 20 : 24}
                    className="opacity-80 hover:opacity-100"
                  />
                </Link>
              )}
            </div>
            
            <span className={`leading-none text-muted-foreground mb-2 ${
              isSmallScreen ? 'text-sm' : 'text-base lg:text-lg'
            }`}>
              @{userBio.username}
            </span>
          </div>
        </div>
        
        {/* Bio */}
        {userBio.bio && (
          <p className={`text-card-foreground/90 mb-3 ${
            isSmallScreen ? 'text-sm line-clamp-3' : 'text-base lg:text-lg lg:line-clamp-none'
          }`}>
            {userBio.bio}
          </p>
        )}
        
        {/* Connected Services / Platform Preferences */}
        <div className="flex items-center mb-4">
          <ConnectedServices
            services={userBio.connectedServices}
            platformPreferences={userBio.platformPreferences}
            isSmallScreen={isSmallScreen}
            isLargeScreen={isLargeScreen}
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 lg:flex-col lg:gap-4">
          <Button
            onClick={onShare}
            className={`rounded-xl gap-2 ${
              isSmallScreen ? 'h-8 px-3 text-xs' : isLargeScreen ? 'h-12 px-6 text-base' : 'h-9 px-4 text-sm'
            }`}
          >
            <Image
              src="/images/ic_share.png"
              alt="Share"
              width={isSmallScreen ? 14 : 16}
              height={isSmallScreen ? 14 : 16}
            />
            <span>Share Profile</span>
          </Button>

          {isCurrentUser && onAddMusic && (
            <Button
              variant="outline"
              onClick={onAddMusic}
              className={`rounded-xl gap-2 ${
                isSmallScreen ? 'h-8 px-3 text-xs' : isLargeScreen ? 'h-12 px-6 text-base' : 'h-9 px-4 text-sm'
              }`}
            >
              <Image
                src="/images/ic_music.png"
                alt="Add Music"
                width={isSmallScreen ? 14 : 16}
                height={isSmallScreen ? 14 : 16}
              />
              <span>Add Music</span>
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
  isSmallScreen,
  isLargeScreen
}: {
  services: ConnectedService[];
  platformPreferences?: PlatformPreferenceInfo[];
  isSmallScreen: boolean;
  isLargeScreen: boolean;
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
      'spotify': 'bg-[#1DB954]/20 border-[#1DB954]/50',
      'applemusic': 'bg-[#FA233B]/20 border-[#FA233B]/50',
      'apple': 'bg-[#FA233B]/20 border-[#FA233B]/50',
      'youtube': 'bg-red-500/20 border-red-500/50',
      'tidal': 'bg-blue-500/20 border-blue-500/50',
      'deezer': 'bg-purple-500/20 border-purple-500/50',
    };

    return colorMap[normalized] || 'bg-gray-400/20 border-gray-400/50';
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

  const iconSize = isSmallScreen ? 'w-7 h-7' : isLargeScreen ? 'w-9 h-9' : 'w-8 h-8';

  return (
    <div className="flex gap-2 overflow-x-auto max-w-full">
      {displayItems.map((item) => (
        <div
          key={item.key}
          className={`flex-shrink-0 ${iconSize} rounded-lg p-1.5 ${getServiceColor(item.type)} border`}
        >
          <Image
            src={getServiceIcon(item.type)}
            alt={item.type}
            width={isSmallScreen ? 20 : isLargeScreen ? 28 : 24}
            height={isSmallScreen ? 20 : isLargeScreen ? 28 : 24}
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}
