'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiService } from '@/services/api';
import { PostComment } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { Heart, Pencil, Trash2, X, Check, MessageCircle, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const COMMENT_MAX_LENGTH = 2000;
const CHAR_WARNING_THRESHOLD = 200;
const DEFAULT_VISIBLE_REPLIES = 2;

interface PostCommentsCardProps {
  postId: string;
  isVisible: boolean;
  commentsEnabled: boolean;
  currentUserId?: string;
  currentUsername?: string;
  className?: string;
}

export function PostCommentsCard({
  postId,
  isVisible,
  commentsEnabled,
  currentUserId,
  currentUsername,
  className,
}: PostCommentsCardProps) {
  const queryClient = useQueryClient();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingLikeIds, setPendingLikeIds] = useState<Record<string, boolean>>({});
  const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
  const [visibleRepliesCount, setVisibleRepliesCount] = useState<Record<string, number>>({});

  const loadComments = useCallback(async () => {
    if (!isVisible) return;
    setIsLoading(true);
    try {
      const response = await apiService.getPostComments(postId, 1, 50);
      setComments(Array.isArray(response.items) ? response.items : []);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments.');
    } finally {
      setIsLoading(false);
    }
  }, [isVisible, postId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleCreate = useCallback(async () => {
    const content = newComment.trim();
    if (!commentsEnabled) {
      toast.error('Comments are turned off for this post.');
      return;
    }
    if (!content) return;
    if (content.length > COMMENT_MAX_LENGTH) {
      toast.error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`);
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticComment: PostComment = {
      commentId: optimisticId,
      postId,
      parentCommentId: null,
      userId: currentUserId || '',
      username: currentUsername || 'you',
      userAvatarUrl: null,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      likeCount: 0,
      likedByCurrentUser: false,
      isOwnedByCurrentUser: true,
      canDelete: true,
    };

    setIsCreating(true);
    setNewComment('');
    setComments((prev) => [...prev, optimisticComment]);

    try {
      const created = await apiService.createPostComment(postId, content);
      setComments((prev) => prev.map((item) => (item.commentId === optimisticId ? created : item)));
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      setComments((prev) => prev.filter((item) => item.commentId !== optimisticId));
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Comments are turned off for this post.');
      } else if (error instanceof ApiError && error.status === 401) {
        toast.error('Sign in again to comment.');
      } else {
        toast.error('Failed to add comment.');
      }
    } finally {
      setIsCreating(false);
    }
  }, [commentsEnabled, currentUserId, currentUsername, newComment, postId, queryClient]);

  const cancelReply = useCallback(() => {
    setReplyingToCommentId(null);
    setReplyContent('');
  }, []);

  const handleReply = useCallback(async (parentComment: PostComment) => {
    const content = replyContent.trim();
    if (!commentsEnabled) {
      toast.error('Comments are turned off for this post.');
      return;
    }
    if (!content) return;
    if (content.length > COMMENT_MAX_LENGTH) {
      toast.error(`Replies can be up to ${COMMENT_MAX_LENGTH} characters.`);
      return;
    }

    const optimisticId = `temp-reply-${Date.now()}`;
    const optimisticReply: PostComment = {
      commentId: optimisticId,
      postId: parentComment.postId,
      parentCommentId: parentComment.commentId,
      userId: currentUserId || '',
      username: currentUsername || 'you',
      userAvatarUrl: null,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      likeCount: 0,
      likedByCurrentUser: false,
      isOwnedByCurrentUser: true,
      canDelete: true,
    };

    setIsReplying(true);
    setExpandedThreads((prev) => ({ ...prev, [parentComment.commentId]: true }));
    setVisibleRepliesCount((prev) => ({
      ...prev,
      [parentComment.commentId]: Math.max(prev[parentComment.commentId] ?? DEFAULT_VISIBLE_REPLIES, DEFAULT_VISIBLE_REPLIES + 1),
    }));
    cancelReply();
    setComments((prev) => [...prev, optimisticReply]);

    try {
      const created = await apiService.replyToPostComment(parentComment.commentId, content);
      setComments((prev) => prev.map((item) => (item.commentId === optimisticId ? created : item)));
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (error) {
      setComments((prev) => prev.filter((item) => item.commentId !== optimisticId));
      if (error instanceof ApiError && error.status === 403) {
        toast.error('Comments are turned off for this post.');
      } else if (error instanceof ApiError && error.status === 401) {
        toast.error('Sign in again to reply.');
      } else {
        toast.error('Failed to add reply.');
      }
    } finally {
      setIsReplying(false);
    }
  }, [cancelReply, commentsEnabled, currentUserId, currentUsername, replyContent, queryClient]);

  const startEdit = useCallback((comment: PostComment) => {
    setEditingCommentId(comment.commentId);
    setEditingContent(comment.content);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditingContent('');
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingCommentId) return;
    const content = editingContent.trim();
    if (!content) return;
    if (content.length > COMMENT_MAX_LENGTH) {
      toast.error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`);
      return;
    }

    const previousComments = comments;
    setComments((prev) =>
      prev.map((item) =>
        item.commentId === editingCommentId
          ? { ...item, content, updatedAt: new Date().toISOString() }
          : item
      )
    );
    cancelEdit();

    try {
      const updated = await apiService.updatePostComment(editingCommentId, content);
      setComments((prev) =>
        prev.map((item) => (item.commentId === editingCommentId ? updated : item))
      );
    } catch (error) {
      setComments(previousComments);
      if (error instanceof ApiError && error.status === 401) {
        toast.error('Sign in again to edit comments.');
      } else {
        toast.error('Failed to update comment.');
      }
    }
  }, [cancelEdit, comments, editingCommentId, editingContent]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      const previousComments = comments;
      setPendingDeleteId(commentId);
      setComments((prev) => prev.filter((item) => item.commentId !== commentId));

      try {
        await apiService.deletePostComment(commentId);
      } catch (error) {
        setComments(previousComments);
        if (error instanceof ApiError && error.status === 401) {
          toast.error('Sign in again to delete comments.');
        } else {
          toast.error('Failed to delete comment.');
        }
      } finally {
        setPendingDeleteId((prev) => (prev === commentId ? null : prev));
      }
    },
    [comments]
  );

  const handleToggleLike = useCallback(async (comment: PostComment) => {
    const commentId = comment.commentId;
    if (pendingLikeIds[commentId]) return;
    const nextLiked = !comment.likedByCurrentUser;
    const nextCount = Math.max(0, (comment.likeCount || 0) + (nextLiked ? 1 : -1));

    setPendingLikeIds((prev) => ({ ...prev, [commentId]: true }));
    setComments((prev) =>
      prev.map((item) =>
        item.commentId === commentId
          ? { ...item, likedByCurrentUser: nextLiked, likeCount: nextCount }
          : item
      )
    );

    try {
      const response = nextLiked
        ? await apiService.likePostComment(commentId)
        : await apiService.unlikePostComment(commentId);
      setComments((prev) =>
        prev.map((item) =>
          item.commentId === commentId
            ? {
                ...item,
                likedByCurrentUser: response.liked,
                likeCount: Math.max(0, response.likeCount),
              }
            : item
        )
      );
    } catch (error) {
      setComments((prev) =>
        prev.map((item) =>
          item.commentId === commentId
            ? { ...item, likedByCurrentUser: comment.likedByCurrentUser, likeCount: comment.likeCount }
            : item
        )
      );
      if (error instanceof ApiError && error.status === 401) {
        toast.error('Sign in again to like comments.');
      } else {
        toast.error('Failed to update comment like.');
      }
    } finally {
      setPendingLikeIds((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  }, [pendingLikeIds]);

  const remainingCharacters = COMMENT_MAX_LENGTH - newComment.length;
  const replyRemainingCharacters = COMMENT_MAX_LENGTH - replyContent.length;
  const canSubmit = newComment.trim().length > 0 && remainingCharacters >= 0 && commentsEnabled;
  const hasComments = comments.length > 0;
  const canSubmitReply = replyContent.trim().length > 0 && replyRemainingCharacters >= 0 && commentsEnabled;

  const thread = useMemo(() => {
    const roots: PostComment[] = [];
    const repliesByParent = new Map<string, PostComment[]>();

    comments.forEach((comment) => {
      const parentId = comment.parentCommentId ?? null;
      if (!parentId) {
        roots.push(comment);
        return;
      }

      const siblings = repliesByParent.get(parentId) || [];
      siblings.push(comment);
      repliesByParent.set(parentId, siblings);
    });

    return { roots, repliesByParent };
  }, [comments]);

  const renderCommentNode = (comment: PostComment, depth = 0) => {
    const isEditing = editingCommentId === comment.commentId;
    const isReplyingHere = replyingToCommentId === comment.commentId;
    const likePending = Boolean(pendingLikeIds[comment.commentId]);
    const children = thread.repliesByParent.get(comment.commentId) || [];
    const isExpanded = Boolean(expandedThreads[comment.commentId]);
    const currentVisibleCount = visibleRepliesCount[comment.commentId] ?? DEFAULT_VISIBLE_REPLIES;
    const visibleChildren = isExpanded ? children.slice(0, currentVisibleCount) : [];
    const hasHiddenReplies = children.length > currentVisibleCount;
    const commentInitial = comment.username?.charAt(0)?.toUpperCase() || 'U';

    return (
      <motion.div
        key={comment.commentId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(depth > 0 && 'ml-6 sm:ml-10')}
      >
        {depth > 0 && (
          <div className="relative">
            <div className="absolute -left-4 sm:-left-6 top-0 bottom-0 w-px bg-border/50" />
            <div className="absolute -left-4 sm:-left-6 top-5 w-3 sm:w-5 h-px bg-border/50" />
          </div>
        )}

        <div className={cn(
          'group rounded-xl p-2.5 sm:p-4 transition-colors duration-150',
          depth === 0
            ? 'bg-background/50 border border-border/60 hover:border-border'
            : 'bg-background/30 hover:bg-background/50'
        )}>
          <div className="flex gap-2.5 sm:gap-3">
            <Link href={`/profile/${comment.username}`} className="flex-shrink-0">
              <Avatar className={cn('ring-1 ring-border/50', depth === 0 ? 'h-7 w-7 sm:h-9 sm:w-9' : 'h-6 w-6 sm:h-7 sm:w-7')}>
                <AvatarImage src={comment.userAvatarUrl ?? undefined} alt={`@${comment.username}`} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-xs">
                  {commentInitial}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/profile/${comment.username}`} className="text-sm font-semibold text-foreground hover:underline">
                  {comment.username}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(comment.createdAt)}
                </span>
                {comment.updatedAt && (
                  <span className="text-xs text-muted-foreground italic">edited</span>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    className="min-h-[72px] resize-none bg-card border-border/60 dark:bg-secondary dark:text-secondary-foreground"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs">
                      <X className="mr-1 h-3 w-3" />
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={() => void saveEdit()} className="h-7 text-xs">
                      <Check className="mr-1 h-3 w-3" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm text-foreground/85 leading-relaxed">
                  {comment.content}
                </p>
              )}

              {!isEditing && (
                <div className="flex items-center gap-1 mt-2">
                  <motion.button
                    type="button"
                    disabled={likePending}
                    onClick={() => void handleToggleLike(comment)}
                    whileTap={{ scale: 0.85 }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-all duration-200',
                      comment.likedByCurrentUser
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={comment.likedByCurrentUser ? 'liked' : 'not'}
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        className="flex items-center"
                      >
                        <Heart className={cn('h-3 w-3', comment.likedByCurrentUser ? 'fill-current' : 'fill-none')} />
                      </motion.span>
                    </AnimatePresence>
                    {(comment.likeCount || 0) > 0 && (
                      <span>{Math.max(0, comment.likeCount || 0)}</span>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    disabled={!commentsEnabled}
                    onClick={() => {
                      if (isReplyingHere) {
                        cancelReply();
                        return;
                      }
                      setReplyingToCommentId(comment.commentId);
                      setReplyContent('');
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                      isReplyingHere
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                      'disabled:opacity-50'
                    )}
                    aria-label="Reply to comment"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>Reply</span>
                  </button>

                  <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {comment.isOwnedByCurrentUser && (
                      <button
                        type="button"
                        onClick={() => startEdit(comment)}
                        className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        aria-label="Edit comment"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {comment.canDelete && (
                      <button
                        type="button"
                        disabled={pendingDeleteId === comment.commentId}
                        onClick={() => void handleDelete(comment.commentId)}
                        className="rounded-full p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        aria-label="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {isReplyingHere && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2 rounded-lg bg-background/60 p-3 border border-border/40">
                      <Textarea
                        value={replyContent}
                        onChange={(event) => setReplyContent(event.target.value)}
                        placeholder={`Reply to ${comment.username}...`}
                        disabled={isReplying || !commentsEnabled}
                        className="min-h-[64px] resize-none bg-card border-border/50 text-sm dark:bg-secondary dark:text-secondary-foreground dark:placeholder:text-secondary-foreground/50"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        {replyRemainingCharacters < CHAR_WARNING_THRESHOLD ? (
                          <span className={cn('text-xs tabular-nums', replyRemainingCharacters < 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                            {replyRemainingCharacters}
                          </span>
                        ) : (
                          <span />
                        )}
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={cancelReply} className="h-7 text-xs">
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!canSubmitReply || isReplying}
                            onClick={() => void handleReply(comment)}
                            className="h-7 text-xs"
                          >
                            Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {children.length > 0 && (
          <div className="mt-1.5">
            {!isExpanded ? (
              <button
                type="button"
                onClick={() => setExpandedThreads((prev) => ({ ...prev, [comment.commentId]: true }))}
                className="ml-6 sm:ml-10 inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors py-1"
              >
                <ChevronDown className="h-3 w-3" />
                {children.length === 1 ? '1 reply' : `${children.length} replies`}
              </button>
            ) : (
              <div className="space-y-1.5 mt-1.5">
                {visibleChildren.map((child) => renderCommentNode(child, depth + 1))}

                <div className="ml-6 sm:ml-10 flex items-center gap-3 py-1">
                  {hasHiddenReplies && (
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleRepliesCount((prev) => ({
                          ...prev,
                          [comment.commentId]: (prev[comment.commentId] ?? DEFAULT_VISIBLE_REPLIES) + DEFAULT_VISIBLE_REPLIES,
                        }))
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Show more
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedThreads((prev) => ({ ...prev, [comment.commentId]: false }));
                      setVisibleRepliesCount((prev) => ({ ...prev, [comment.commentId]: DEFAULT_VISIBLE_REPLIES }));
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronUp className="h-3 w-3" />
                    Collapse
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className={cn('w-full rounded-2xl border border-border bg-card p-3 sm:p-5 shadow-lg', className)}>
      <div className="flex items-center gap-3 mb-3 sm:mb-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4.5 w-4.5 text-foreground" />
          <h3 className="text-base font-semibold text-foreground">Comments</h3>
        </div>
        {hasComments && (
          <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {comments.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          placeholder={commentsEnabled ? 'Share your thoughts...' : 'Comments are turned off'}
          disabled={isCreating || !commentsEnabled}
          className="min-h-[64px] sm:min-h-[80px] resize-none bg-card border-border/60 text-sm placeholder:text-muted-foreground/60 dark:bg-secondary dark:text-secondary-foreground dark:placeholder:text-secondary-foreground/50"
        />
        <div className="flex items-center justify-between">
          <div>
            {remainingCharacters < CHAR_WARNING_THRESHOLD ? (
              <span className={cn('text-xs tabular-nums', remainingCharacters < 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                {remainingCharacters} characters remaining
              </span>
            ) : !commentsEnabled ? (
              <span className="text-xs text-muted-foreground">Comments are disabled for this post.</span>
            ) : null}
          </div>
          <Button
            onClick={handleCreate}
            disabled={!canSubmit || isCreating}
            size="sm"
            className="h-8 px-4 text-xs font-semibold"
          >
            {isCreating ? 'Sending...' : 'Comment'}
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            <p className="text-xs text-muted-foreground">Loading comments...</p>
          </div>
        )}
        {!isLoading && !hasComments && (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="rounded-full bg-muted/40 p-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">No comments yet</p>
            {commentsEnabled && (
              <p className="text-xs text-muted-foreground/60">Be the first to share your thoughts</p>
            )}
          </div>
        )}
        {thread.roots.map((comment) => renderCommentNode(comment))}
      </div>
    </div>
  );
}
