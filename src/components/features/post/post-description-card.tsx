'use client';

import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { BodyText } from '@/components/ui/typography';
import { useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';

interface PostDescriptionCardProps {
  username: string;
  description: string;
  createdAt?: string;
  className?: string;
}

export function PostDescriptionCard({
  username,
  description,
  createdAt,
  className,
}: PostDescriptionCardProps) {
  // Use React Query - will be deduplicated across all PostDescriptionCards
  // for the same username
  const { data: profileData, isLoading } = useUserBio(username);

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
      <div className={cn("flex gap-3", description?.trim() ? "items-start" : "items-center")}>
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
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
