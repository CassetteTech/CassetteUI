'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';

interface PostAuthorHeaderProps {
  username: string;
  description?: string;
  createdAt?: string;
  conversionSuccessCount?: number;
  className?: string;
}

export function PostAuthorHeader({
  username,
  description,
  createdAt,
  conversionSuccessCount,
  className,
}: PostAuthorHeaderProps) {
  const { data: profileData, isLoading: profileLoading } = useUserBio(username);

  const initial = username?.charAt(0)?.toUpperCase() || 'U';
  const avatarUrl = profileData?.avatarUrl;
  const hasConversionCount = typeof conversionSuccessCount === 'number';
  const formattedCount = hasConversionCount
    ? new Intl.NumberFormat('en-US').format(Math.max(0, conversionSuccessCount))
    : null;
  const hasCaption = Boolean(description?.trim());

  return (
    <div className={cn('flex gap-3', hasCaption ? 'items-start' : 'items-center', className)}>
      <Link href={`/profile/${username}`} className="flex-shrink-0">
        {profileLoading ? (
          <Skeleton className="size-9 sm:size-10 rounded-full" />
        ) : (
          <Avatar className="size-9 sm:size-10 ring-1 ring-border">
            <AvatarImage src={avatarUrl} alt={`@${username}`} className="object-cover" />
            <AvatarFallback className="bg-muted text-muted-foreground font-atkinson font-bold text-sm tracking-wide">
              {initial}
            </AvatarFallback>
          </Avatar>
        )}
      </Link>

      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
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
          {hasConversionCount && (
            <Badge variant="outline" className="border-success/25 bg-success/10 text-success-text font-atkinson font-semibold tracking-wide ml-auto">
              <CheckCircle2 />
              {formattedCount} successful conversions
            </Badge>
          )}
        </div>

        {hasCaption && (
          <p className="font-atkinson text-[15px] font-normal text-foreground/90 leading-relaxed tracking-wide break-words text-left whitespace-pre-wrap">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
