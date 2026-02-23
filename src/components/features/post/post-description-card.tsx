'use client';

import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { BodyText } from '@/components/ui/typography';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { CheckCircle2 } from 'lucide-react';

interface PostDescriptionCardProps {
  username: string;
  description: string;
  createdAt?: string;
  conversionSuccessCount?: number;
  className?: string;
}

export function PostDescriptionCard({
  username,
  description,
  createdAt,
  conversionSuccessCount,
  className,
}: PostDescriptionCardProps) {
  // Use React Query - will be deduplicated across all PostDescriptionCards
  // for the same username
  const { data: profileData, isLoading } = useUserBio(username);

  const initial = username?.charAt(0)?.toUpperCase() || 'U';
  const avatarUrl = profileData?.avatarUrl;
  const hasConversionCount = typeof conversionSuccessCount === 'number';
  const formattedCount = hasConversionCount
    ? new Intl.NumberFormat('en-US').format(Math.max(0, conversionSuccessCount))
    : null;

  return (
    <div
      className={cn(
        'p-3 sm:p-4 md:p-5 rounded-xl',
        'border border-border',
        'bg-card',
        className
      )}
    >
      <div className={cn("flex gap-3", description?.trim() ? "items-start" : "items-center")}>
        <Link href={`/profile/${username}`} className="flex-shrink-0">
          {isLoading ? (
            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
          ) : (
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-1 ring-border">
              <AvatarImage src={avatarUrl} alt={`@${username}`} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground font-atkinson font-semibold text-sm">
                {initial}
              </AvatarFallback>
            </Avatar>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${username}`}
              className="font-semibold text-foreground text-sm flex items-center gap-1"
            >
              {username}
              <VerificationBadge accountType={profileData?.accountType} size="sm" />
            </Link>
            <span className="text-xs text-muted-foreground">
              shared this
            </span>
            {createdAt && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(createdAt)}
                </span>
              </>
            )}
          </div>

          {description && (
            <BodyText className="text-foreground/90 text-sm leading-relaxed break-words">
              {description}
            </BodyText>
          )}

          {hasConversionCount && (
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-medium text-success-text">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {formattedCount} successful conversions
              </span>
            </div>
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
        'p-3 sm:p-4 md:p-5 rounded-xl',
        'border border-border',
        'bg-card',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-baseline gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
