'use client';

import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { BodyText } from '@/components/ui/typography';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { CheckCircle2, Heart, Repeat2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PostDescriptionCardProps {
  username: string;
  description: string;
  createdAt?: string;
  conversionSuccessCount?: number;
  likeCount?: number;
  likedByCurrentUser?: boolean;
  isLikePending?: boolean;
  onToggleLike?: () => void;
  canRepost?: boolean;
  hasReposted?: boolean;
  isRepostPending?: boolean;
  onRepost?: () => void;
  className?: string;
}

export function PostDescriptionCard({
  username,
  description,
  createdAt,
  conversionSuccessCount,
  likeCount,
  likedByCurrentUser,
  isLikePending = false,
  onToggleLike,
  canRepost = false,
  hasReposted = false,
  isRepostPending = false,
  onRepost,
  className,
}: PostDescriptionCardProps) {
  const { data: profileData, isLoading } = useUserBio(username);

  const initial = username?.charAt(0)?.toUpperCase() || 'U';
  const avatarUrl = profileData?.avatarUrl;
  const hasConversionCount = typeof conversionSuccessCount === 'number';
  const formattedCount = hasConversionCount
    ? new Intl.NumberFormat('en-US').format(Math.max(0, conversionSuccessCount))
    : null;
  const normalizedLikeCount = Math.max(0, likeCount ?? 0);
  const formattedLikeCount = new Intl.NumberFormat('en-US').format(normalizedLikeCount);
  const hasLikeData = typeof likeCount === 'number';

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

          {(hasConversionCount || hasLikeData) && (
            <div className="pt-3 flex items-center gap-2.5 flex-wrap">
              {hasLikeData && (
                <>
                  <motion.button
                    type="button"
                    onClick={onToggleLike}
                    disabled={!onToggleLike || isLikePending}
                    aria-label={likedByCurrentUser ? 'Unlike post' : 'Like post'}
                    aria-pressed={likedByCurrentUser}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                      likedByCurrentUser
                        ? 'border-primary/40 bg-primary/10 text-primary shadow-sm shadow-primary/10'
                        : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:border-border',
                      isLikePending && 'opacity-70'
                    )}
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={likedByCurrentUser ? 'liked' : 'not-liked'}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15, duration: 0.2 }}
                        className="flex items-center"
                      >
                        <Heart
                          className={cn(
                            'h-3.5 w-3.5',
                            likedByCurrentUser ? 'fill-current' : 'fill-none'
                          )}
                        />
                      </motion.span>
                    </AnimatePresence>
                    <span>{formattedLikeCount}</span>
                  </motion.button>
                  {canRepost && (
                    <motion.button
                      type="button"
                      onClick={onRepost}
                      disabled={!onRepost || isRepostPending}
                      whileTap={{ scale: 0.9 }}
                      aria-label={
                        isRepostPending
                          ? (hasReposted ? 'Removing repost' : 'Reposting')
                          : (hasReposted ? 'Remove repost' : 'Repost post')
                      }
                      className={cn(
                        'inline-flex items-center justify-center rounded-full border p-2 text-xs font-medium transition-all duration-200',
                        hasReposted
                          ? 'border-success/35 bg-success/15 text-success-text shadow-sm shadow-success/10'
                          : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:border-border',
                        isRepostPending && 'opacity-70'
                      )}
                    >
                      <Repeat2 className="h-3.5 w-3.5" />
                    </motion.button>
                  )}
                </>
              )}

              {hasConversionCount && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1.5 text-xs font-medium text-success-text">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {formattedCount} successful conversions
              </span>
              )}
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
