'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { BodyText } from '@/components/ui/typography';
import { profileService } from '@/services/profile';
import { cn } from '@/lib/utils';
import type { UserBio } from '@/types';

interface PostDescriptionCardProps {
  username: string;
  description: string;
  className?: string;
}

export function PostDescriptionCard({
  username,
  description,
  className,
}: PostDescriptionCardProps) {
  const [profileData, setProfileData] = useState<UserBio | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const bio = await profileService.fetchUserBio(username);
        setProfileData(bio);
      } catch (error) {
        console.error('Failed to fetch profile for post description:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const initial = username?.charAt(0)?.toUpperCase() || 'U';
  const avatarUrl = profileData?.avatarUrl;

  return (
    <div
      className={cn(
        'p-5 rounded-xl',
        'border border-border',
        'bg-card',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Link href={`/profile/${username}`} className="flex-shrink-0">
          {isLoading ? (
            <Skeleton className="h-10 w-10 rounded-full" />
          ) : (
            <Avatar className="h-10 w-10 ring-1 ring-border">
              <AvatarImage src={avatarUrl} alt={`@${username}`} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground font-atkinson font-semibold text-sm">
                {initial}
              </AvatarFallback>
            </Avatar>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/profile/${username}`}
              className="font-semibold text-foreground text-sm"
            >
              {username}
            </Link>
            <span className="text-xs text-muted-foreground">
              shared this
            </span>
          </div>

          {description && (
            <BodyText className="text-foreground/90 text-sm leading-relaxed break-words">
              {description}
            </BodyText>
          )}
        </div>
      </div>
    </div>
  );
}

export function PostDescriptionCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-xl',
        'border border-border',
        'bg-card',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
