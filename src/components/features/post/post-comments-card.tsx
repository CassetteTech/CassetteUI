'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, apiService } from '@/services/api';
import { PostComment } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { Heart, Pencil, Trash2, X, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const COMMENT_MAX_LENGTH = 2000;
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
  }, [commentsEnabled, currentUserId, currentUsername, newComment, postId]);

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
  }, [cancelReply, commentsEnabled, currentUserId, currentUsername, replyContent]);

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
  const subtitle = useMemo(() => {
    if (comments.length === 1) return '1 comment';
    return `${comments.length} comments`;
  }, [comments.length]);

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
    const nestedClass = depth > 0 ? 'ml-4 border-l border-border/60 pl-3' : '';

    return (
      <div key={comment.commentId} className={nestedClass}>
        <div className="rounded-xl border border-border/70 bg-background/30 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{comment.username}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(comment.createdAt)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={likePending}
                onClick={() => void handleToggleLike(comment)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs',
                  comment.likedByCurrentUser
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <Heart className={cn('h-3.5 w-3.5', comment.likedByCurrentUser ? 'fill-current' : 'fill-none')} />
                <span>{Math.max(0, comment.likeCount || 0)}</span>
              </button>
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
                className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
                aria-label="Reply to comment"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </button>
              {comment.isOwnedByCurrentUser && (
                <button
                  type="button"
                  onClick={() => startEdit(comment)}
                  className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Edit comment"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {comment.canDelete && (
                <button
                  type="button"
                  disabled={pendingDeleteId === comment.commentId}
                  onClick={() => void handleDelete(comment.commentId)}
                  className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-muted"
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editingContent}
                onChange={(event) => setEditingContent(event.target.value)}
                className="min-h-[72px] resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={() => void saveEdit()}>
                  <Check className="mr-1 h-3.5 w-3.5" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{comment.content}</p>
          )}

          {isReplyingHere && (
            <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background/50 p-2.5">
              <Textarea
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                placeholder="Write a reply..."
                disabled={isReplying || !commentsEnabled}
                className="min-h-[72px] resize-none"
              />
              <div className="flex items-center justify-between">
                <span className={cn('text-xs', replyRemainingCharacters < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                  {replyRemainingCharacters}
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={cancelReply}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canSubmitReply || isReplying}
                    onClick={() => void handleReply(comment)}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {children.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              {!isExpanded ? (
                <button
                  type="button"
                  onClick={() => setExpandedThreads((prev) => ({ ...prev, [comment.commentId]: true }))}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  View replies ({children.length})
                </button>
              ) : (
                <>
                  {hasHiddenReplies && (
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleRepliesCount((prev) => ({
                          ...prev,
                          [comment.commentId]: (prev[comment.commentId] ?? DEFAULT_VISIBLE_REPLIES) + DEFAULT_VISIBLE_REPLIES,
                        }))
                      }
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      View more replies
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedThreads((prev) => ({ ...prev, [comment.commentId]: false }));
                      setVisibleRepliesCount((prev) => ({ ...prev, [comment.commentId]: DEFAULT_VISIBLE_REPLIES }));
                    }}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Collapse replies
                  </button>
                </>
              )}
            </div>

            {isExpanded && (
              <div className="space-y-2">
                {visibleChildren.map((child) => renderCommentNode(child, depth + 1))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div className={cn('w-full rounded-2xl border border-border bg-card p-5 shadow-lg', className)}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">Comments</h3>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>

      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(event) => setNewComment(event.target.value)}
          placeholder={commentsEnabled ? 'Write a comment...' : 'Comments are turned off'}
          disabled={isCreating || !commentsEnabled}
          className="min-h-[88px] resize-none"
        />
        <div className="flex items-center justify-between">
          <span className={cn('text-xs', remainingCharacters < 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {remainingCharacters}
          </span>
          <Button onClick={handleCreate} disabled={!canSubmit || isCreating} size="sm">
            Post
          </Button>
        </div>
        {!commentsEnabled && (
          <p className="text-xs text-muted-foreground">New comments are currently disabled for this post.</p>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading comments...</p>}
        {!isLoading && !hasComments && (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        )}
        {thread.roots.map((comment) => renderCommentNode(comment))}
      </div>
    </div>
  );
}
