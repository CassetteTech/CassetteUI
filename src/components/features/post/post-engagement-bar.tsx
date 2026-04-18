'use client';

import { Heart, Repeat2, MessageSquare, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PostEngagementBarProps {
  likeCount?: number;
  likedByCurrentUser?: boolean;
  isLikePending?: boolean;
  onToggleLike?: () => void;

  canRepost?: boolean;
  hasReposted?: boolean;
  isRepostPending?: boolean;
  onRepost?: () => void;

  commentCount?: number;
  commentsEnabled?: boolean;
  onOpenComments?: () => void;

  canViewInsights?: boolean;
  onOpenInsights?: () => void;

  className?: string;
  compact?: boolean;
}

export function PostEngagementBar({
  likeCount,
  likedByCurrentUser = false,
  isLikePending = false,
  onToggleLike,
  canRepost = false,
  hasReposted = false,
  isRepostPending = false,
  onRepost,
  commentCount,
  commentsEnabled = true,
  onOpenComments,
  canViewInsights = false,
  onOpenInsights,
  className,
  compact = false,
}: PostEngagementBarProps) {
  const pillPadding = compact ? 'px-0.5 py-0.5' : 'px-0.5 py-0.5 sm:px-1 sm:py-1';
  const btnPadding = compact ? 'px-2 py-0.5' : 'px-2 py-0.5 sm:px-2.5 sm:py-1';
  const btnGap = compact ? 'gap-1' : 'gap-1 sm:gap-1.5';
  const hasLikeData = typeof likeCount === 'number';
  const hasCommentCount = typeof commentCount === 'number';
  const formattedLikes = hasLikeData
    ? new Intl.NumberFormat('en-US').format(Math.max(0, likeCount))
    : null;
  const formattedComments = hasCommentCount
    ? new Intl.NumberFormat('en-US').format(Math.max(0, commentCount))
    : null;

  const commentsAriaLabel = hasCommentCount
    ? `Open comments (${formattedComments})`
    : 'Open comments';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 backdrop-blur-md elev-1',
        pillPadding,
        className,
      )}
    >
      {/* Like */}
      <motion.button
        type="button"
        onClick={onToggleLike}
        disabled={!onToggleLike || isLikePending}
        whileTap={{ scale: 0.92 }}
        aria-label={likedByCurrentUser ? 'Unlike post' : 'Like post'}
        aria-pressed={likedByCurrentUser}
        className={cn(
          'inline-flex items-center rounded-full font-atkinson text-xs font-bold tracking-wide transition-colors duration-100',
          btnGap,
          btnPadding,
          likedByCurrentUser
            ? 'text-primary hover:bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
        )}
      >
        <motion.span
          key={likedByCurrentUser ? 'liked' : 'not-liked'}
          initial={false}
          animate={{ scale: [1, 1.25, 1] }}
          transition={{ duration: 0.25, ease: 'easeOut', times: [0, 0.4, 1] }}
          className="flex items-center"
        >
          <Heart className={cn('size-3.5', likedByCurrentUser && 'fill-current')} />
        </motion.span>
        {hasLikeData && <span className="tabular-nums">{formattedLikes}</span>}
      </motion.button>

      <span className="h-4 w-px bg-border/40" aria-hidden />

      {/* Comments trigger */}
      <motion.button
        type="button"
        data-comments-trigger
        onClick={onOpenComments}
        disabled={!onOpenComments}
        whileTap={{ scale: 0.92 }}
        aria-label={commentsAriaLabel}
        className={cn(
          'inline-flex items-center rounded-full font-atkinson text-xs font-bold tracking-wide transition-colors duration-200',
          btnGap,
          btnPadding,
          'text-muted-foreground hover:text-foreground hover:bg-muted/60',
          !commentsEnabled && 'opacity-70',
        )}
      >
        <MessageSquare className="size-3.5" />
        {hasCommentCount ? (
          <span className="tabular-nums">{formattedComments}</span>
        ) : (
          <span
            aria-hidden
            className="size-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-60"
          />
        )}
      </motion.button>

      {/* Repost */}
      {canRepost && (
        <>
          <span className="h-4 w-px bg-border/40" aria-hidden />
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                type="button"
                onClick={onRepost}
                disabled={!onRepost || isRepostPending}
                whileTap={{ scale: 0.92 }}
                aria-label={hasReposted ? 'Remove repost' : 'Repost'}
                aria-pressed={hasReposted}
                className={cn(
                  'inline-flex items-center justify-center rounded-full p-1.5 transition-colors duration-200',
                  hasReposted
                    ? 'text-success-text hover:bg-success/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  isRepostPending && 'opacity-70',
                )}
              >
                <Repeat2 className="size-3.5" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>{hasReposted ? 'Remove repost' : 'Repost'}</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* Insights (owner only) */}
      {canViewInsights && (
        <>
          <span className="h-4 w-px bg-border/40" aria-hidden />
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                type="button"
                data-insights-trigger
                onClick={onOpenInsights}
                disabled={!onOpenInsights}
                whileTap={{ scale: 0.92 }}
                aria-label="Open post insights"
                className={cn(
                  'inline-flex items-center justify-center rounded-full p-1.5 transition-colors duration-200',
                  'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
              >
                <BarChart3 className="size-3.5" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>Insights</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}
