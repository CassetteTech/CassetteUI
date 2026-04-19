'use client';

import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';

interface PostAuthorHeaderProps {
  username: string;
  description?: string;
  createdAt?: string;
  className?: string;
  compact?: boolean;
}

export function PostAuthorHeader({
  username,
  description,
  createdAt,
  className,
  compact = false,
}: PostAuthorHeaderProps) {
  const { data: profileData, isLoading: profileLoading } = useUserBio(username);

  const initial = username?.charAt(0)?.toUpperCase() || 'U';
  const avatarUrl = profileData?.avatarUrl;
  const hasCaption = Boolean(description?.trim());

  const wrapperGap = compact ? 'gap-2.5' : 'gap-2.5 sm:gap-3';
  const avatarSize = compact ? 'size-8' : 'size-8 sm:size-10';
  const stackGap = compact ? 'gap-1' : 'gap-1 sm:gap-1.5';
  const captionText = compact ? 'text-sm' : 'text-sm sm:text-[15px]';

  return (
    <div className={cn('flex', wrapperGap, hasCaption ? 'items-start' : 'items-center', className)}>
      <Link href={`/profile/${username}`} className="flex-shrink-0">
        {profileLoading ? (
          <Skeleton className={cn(avatarSize, 'rounded-full')} />
        ) : (
          <Avatar className={cn(avatarSize, 'ring-1 ring-border')}>
            <AvatarImage src={avatarUrl} alt={`@${username}`} className="object-cover" />
            <AvatarFallback className="bg-muted text-muted-foreground font-atkinson font-bold text-sm tracking-wide">
              {initial}
            </AvatarFallback>
          </Avatar>
        )}
      </Link>

      <div className={cn('min-w-0 flex-1 flex flex-col', stackGap)}>
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
          <Link
            href={`/profile/${username}`}
            className="font-atkinson font-bold text-foreground text-sm tracking-wide flex items-center gap-1 hover:underline decoration-foreground/40 underline-offset-2"
          >
            {username}
            <VerificationBadge accountType={profileData?.accountType} size="sm" />
          </Link>
          <span className="font-atkinson text-xs text-muted-foreground tracking-wide">shared this</span>
          {createdAt && (
            <>
              <span className="text-xs text-muted-foreground/70" aria-hidden>·</span>
              <span className="font-atkinson text-xs text-muted-foreground tracking-wide tabular-nums">{formatRelativeTime(createdAt)}</span>
            </>
          )}
        </div>

        {hasCaption && (
          <p className={cn('font-atkinson font-normal text-foreground/90 leading-relaxed tracking-wide break-words text-left whitespace-pre-wrap', captionText)}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
