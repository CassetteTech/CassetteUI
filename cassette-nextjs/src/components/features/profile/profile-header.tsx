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
  return (
    <div className="bg-[#1a1a1a] text-white p-4 md:p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar className="w-16 h-16 md:w-20 md:h-20 border-2 border-white/20">
          <AvatarImage 
            src={userBio.avatarUrl || '/images/default-avatar.png'} 
            alt={userBio.username}
          />
          <AvatarFallback>{userBio.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-xl md:text-2xl font-bold text-white">
              {userBio.displayName || userBio.username}
            </h1>
            {isCurrentUser && (
              <Link href="/profile/edit" className="hover:scale-105 transition-transform">
                <Image 
                  src="/images/ic_edit.png" 
                  alt="Edit" 
                  width={20} 
                  height={20}
                  className="opacity-80 hover:opacity-100"
                />
              </Link>
            )}
          </div>
          
          <p className="text-sm md:text-base text-gray-300 mb-2">
            @{userBio.username}
          </p>
          
          {userBio.bio && (
            <p className="text-sm md:text-base text-gray-200 mb-4 max-w-md">
              {userBio.bio}
            </p>
          )}
          
          {/* Connected Services */}
          <div className="flex items-center gap-2 mb-4">
            <ConnectedServices services={userBio.connectedServices} />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <AnimatedButton
              onClick={onShare}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              <Image 
                src="/images/ic_share.png" 
                alt="Share" 
                width={16} 
                height={16}
                className="opacity-90"
              />
              Share Profile
            </AnimatedButton>
            
            {isCurrentUser && onAddMusic && (
              <AnimatedButton
                onClick={onAddMusic}
                className="flex items-center gap-2 bg-transparent border border-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
              >
                <Image 
                  src="/images/ic_music.png" 
                  alt="Add Music" 
                  width={16} 
                  height={16}
                  className="opacity-90"
                />
                Add Music
              </AnimatedButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectedServices({ services }: { services: ConnectedService[] }) {
  const getServiceIcon = (serviceType: string) => {
    const iconMap: Record<string, string> = {
      'spotify': '/images/social_images/ic_spotify.png',
      'apple': '/images/social_images/ic_apple.png',
      'youtube': '/images/social_images/ic_yt_music.png',
      'tidal': '/images/social_images/ic_tidal.png',
      'deezer': '/images/social_images/ic_deezer.png',
    };
    
    return iconMap[serviceType.toLowerCase()] || '/images/social_images/ic_spotify.png';
  };

  const getServiceColor = (serviceType: string) => {
    const colorMap: Record<string, string> = {
      'spotify': 'bg-green-500',
      'apple': 'bg-gray-700',
      'youtube': 'bg-red-500',
      'tidal': 'bg-blue-500',
      'deezer': 'bg-purple-500',
    };
    
    return colorMap[serviceType.toLowerCase()] || 'bg-gray-500';
  };

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-1 overflow-x-auto">
      {services.map((service, index) => (
        <div
          key={`${service.serviceType}-${index}`}
          className={`flex-shrink-0 w-6 h-6 rounded-full p-1 ${getServiceColor(service.serviceType)}`}
        >
          <Image
            src={getServiceIcon(service.serviceType)}
            alt={service.serviceType}
            width={16}
            height={16}
            className="w-full h-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}