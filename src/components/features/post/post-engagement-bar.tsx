'use client';

import { Heart, Repeat2, MessageSquare, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
}: PostEngagementBarProps) {
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
        'inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 px-1 py-1 backdrop-blur-md elev-1',
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
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-atkinson text-xs font-bold tracking-wide transition-colors duration-200',
          likedByCurrentUser
            ? 'text-primary hover:bg-primary/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
          isLikePending && 'opacity-70',
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
            <Heart className={cn('size-3.5', likedByCurrentUser && 'fill-current')} />
          </motion.span>
        </AnimatePresence>
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
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-atkinson text-xs font-bold tracking-wide transition-colors duration-200',
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
