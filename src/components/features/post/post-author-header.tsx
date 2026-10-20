'use client';

import type { ReactNode } from 'react';
import { ProfileLink } from '@/components/features/profile/profile-link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';

/** An avatar photo that loads within this time shows without its initial showing first. */
const AVATAR_FALLBACK_DELAY_MS = 600;

interface PostAuthorHeaderProps {
  username: string;
  /** Shown in place of the username, such as a curator's name. */
  displayName?: string;
  /** Sits at the end of the row, such as Follow. */
  action?: ReactNode;
  description?: string;
  createdAt?: string;
  className?: string;
  compact?: boolean;
}

export function PostAuthorHeader({
  username,
  displayName,
  action,
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
      <ProfileLink username={username} className="flex-shrink-0">
        {/* The author's profile answers after the post; the avatar's circle holds still until then. */}
        <Avatar className={cn(avatarSize, 'bg-muted ring-1 ring-border')}>
          {!profileLoading && (
            <>
              <AvatarImage src={avatarUrl} alt={`@${username}`} className="object-cover" />
              <AvatarFallback
                delayMs={avatarUrl ? AVATAR_FALLBACK_DELAY_MS : 0}
                className="bg-muted text-muted-foreground font-atkinson font-bold text-sm tracking-wide"
              >
                {initial}
              </AvatarFallback>
            </>
          )}
        </Avatar>
      </ProfileLink>

      <div className={cn('min-w-0 flex-1 flex flex-col', stackGap)}>
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
          <ProfileLink
            username={username}
            className="font-atkinson font-bold text-foreground text-sm tracking-wide flex items-center gap-1 hover:underline decoration-foreground/40 underline-offset-2"
          >
            {displayName || username}
            <VerificationBadge accountType={profileData?.accountType} size="sm" />
          </ProfileLink>
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
      {action}
    </div>
  );
}
