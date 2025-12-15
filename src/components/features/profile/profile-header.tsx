'use client';

import Image from 'next/image';
import Link from 'next/link';
import { UserBio, ConnectedService } from '@/types';
import { AnimatedButton } from '@/components/ui/animated-button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
  const fontSize = isSmallScreen ? 'text-xs' : isLargeScreen ? 'text-base' : 'text-sm';
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
        
        {/* Connected Services */}
        <div className="flex items-center mb-4">
          <ConnectedServices services={userBio.connectedServices} isSmallScreen={isSmallScreen} isLargeScreen={isLargeScreen} />
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 lg:flex-col lg:gap-4">
          <AnimatedButton
            onClick={onShare}
            width={isLargeScreen ? 200 : isSmallScreen ? 120 : 132}
            height={isSmallScreen ? 32 : isLargeScreen ? 48 : 36}
            colorTop="#ED2748"
            colorBottom="#E95E75"
            borderColorTop="#FF002B"
            borderColorBottom="#ED2748"
            radius={12}
            textStyle={`text-white font-medium ${fontSize}`}
          >
            <div className="flex items-center justify-center gap-2">
              <Image 
                src="/images/ic_share.png" 
                alt="Share" 
                width={isSmallScreen ? 14 : 16} 
                height={isSmallScreen ? 14 : 16}
                className="opacity-90"
              />
              <span>Share Profile</span>
            </div>
          </AnimatedButton>
          
          {isCurrentUser && onAddMusic && (
            <AnimatedButton
              onClick={onAddMusic}
              width={isLargeScreen ? 200 : isSmallScreen ? 120 : 132}
              height={isSmallScreen ? 32 : isLargeScreen ? 48 : 36}
              colorTop="hsl(var(--card))"
              colorBottom="hsl(var(--muted))"
              borderColorTop="hsl(var(--border))"
              borderColorBottom="hsl(var(--border))"
              radius={12}
              textStyle={`font-medium ${fontSize} text-card-foreground`}
            >
              <div className="flex items-center justify-center gap-2">
                <Image 
                  src="/images/ic_music.png" 
                  alt="Add Music" 
                  width={isSmallScreen ? 14 : 16} 
                  height={isSmallScreen ? 14 : 16}
                  className="opacity-90"
                />
                <span>Add Music</span>
              </div>
            </AnimatedButton>
          )}
        </div>
      </div>
    </div>
  );
}

function ConnectedServices({ services, isSmallScreen, isLargeScreen }: { services: ConnectedService[], isSmallScreen: boolean, isLargeScreen: boolean }) {
  const normalize = (value: unknown) => (typeof value === 'string' ? value : value ? String(value) : '').toLowerCase();

  const getServiceIcon = (serviceType: string) => {
    const iconMap: Record<string, string> = {
      'spotify': '/images/social_images/ic_spotify.png',
      'apple': '/images/social_images/ic_apple.png',
      'youtube': '/images/social_images/ic_yt_music.png',
      'tidal': '/images/social_images/ic_tidal.png',
      'deezer': '/images/social_images/ic_deezer.png',
    };
    
    return iconMap[normalize(serviceType)] || '/images/social_images/ic_spotify.png';
  };

  const getServiceColor = (serviceType: string) => {
    const colorMap: Record<string, string> = {
      'spotify': 'text-green-500',
      'apple': 'text-gray-300',
      'youtube': 'text-red-500',
      'tidal': 'text-blue-500',
      'deezer': 'text-purple-500',
    };
    
    return colorMap[normalize(serviceType)] || 'text-gray-400';
  };

  if (!services || services.length === 0) {
    return null;
  }

  const iconSize = isSmallScreen ? 'w-5 h-5' : isLargeScreen ? 'w-7 h-7' : 'w-6 h-6';
  const padding = isSmallScreen ? 'p-1' : 'p-1';
  
  return (
    <div className="flex gap-2 overflow-x-auto max-w-full">
      {services.map((service, index) => (
        <div
          key={`${service.serviceType}-${index}`}
          className={`flex-shrink-0 ${iconSize} rounded-full ${padding} ${getServiceColor(service.serviceType)} bg-opacity-20 border border-current`}
        >
          <Image
            src={getServiceIcon(service.serviceType)}
            alt={service.serviceType}
            width={isSmallScreen ? 16 : isLargeScreen ? 24 : 20}
            height={isSmallScreen ? 16 : isLargeScreen ? 24 : 20}
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}
