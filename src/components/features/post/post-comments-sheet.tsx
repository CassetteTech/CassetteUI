'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Link from 'next/link';
import { ApiError, apiService } from '@/services/api';
import { PostComment } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/format-date';
import {
  Heart,
  Pencil,
  Trash2,
  X,
  Check,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  XIcon,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const COMMENT_MAX_LENGTH = 2000;
const CHAR_WARNING_THRESHOLD = 200;
const DEFAULT_VISIBLE_REPLIES = 2;

interface PostCommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  commentsEnabled: boolean;
  currentUserId?: string;
  currentUsername?: string;
  onCountChange?: (count: number) => void;
}

export function PostCommentsSheet({
  open,
  onOpenChange,
  postId,
  commentsEnabled,
  currentUserId,
  currentUsername,
  onCountChange,
}: PostCommentsSheetProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [comments, setComments] = useState<PostComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
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
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Mobile: lock the document so iOS Safari's form-assistant auto-scroll has
  // no scrollable root to pin onto. The overlay itself is position: fixed, so
  // even if something did scroll, the UI stays put.
  useEffect(() => {
    if (!isMobile || !open) return;
    const html = document.documentElement;
    const body = document.body;
    const savedScrollY = window.scrollY;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      window.scrollTo(0, savedScrollY);
    };
  }, [isMobile, open]);

  // Intercept the initial tap on the composer textarea so iOS Safari's
  // form-assistant auto-scroll routine never runs. `focus({preventScroll:true})`
  // is honored on iOS 15+; the focus must be synchronous with the user gesture
  // or iOS will suppress the software keyboard.
  const handleTextareaPointerDown = useCallback((event: ReactPointerEvent<HTMLTextAreaElement>) => {
    if (event.pointerType === 'mouse') return;
    const el = textareaRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    event.preventDefault();
    el.focus({ preventScroll: true });
  }, []);

  // Track the on-screen keyboard via visualViewport so the mobile input bar
  // can slide up while the comments list behind stays anchored.
  // Using documentElement.clientHeight (layout viewport) instead of
  // window.innerHeight because iOS Safari 13+ shrinks innerHeight to the
  // *visual* viewport height when the keyboard is up, which would make
  // (innerHeight - vv.height) collapse to ~0 and leave the composer under the keyboard.
  useEffect(() => {
    if (!isMobile || !open) { setKeyboardOffset(0); return; }
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const layoutHeight = document.documentElement.clientHeight;
      const offset = Math.max(0, layoutHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, [isMobile, open]);

  useEffect(() => {
    if (!isMobile || !open) return;
    const composerElement = composerRef.current;
    if (!composerElement) return;

    const ESTIMATED_KEYBOARD_HEIGHT = 320;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        setKeyboardOffset((current) => (current > 0 ? current : ESTIMATED_KEYBOARD_HEIGHT));
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        setTimeout(() => {
          const vv = window.visualViewport;
          const stillCovered = vv ? window.innerHeight - vv.height - vv.offsetTop : 0;
          if (stillCovered <= 0) setKeyboardOffset(0);
        }, 50);
      }
    };

    composerElement.addEventListener('focusin', onFocusIn);
    composerElement.addEventListener('focusout', onFocusOut);
    return () => {
      composerElement.removeEventListener('focusin', onFocusIn);
      composerElement.removeEventListener('focusout', onFocusOut);
    };
  }, [isMobile, open]);

  useEffect(() => {
    if (!isMobile || !open) return;
    const composerElement = composerRef.current;
    const listElement = listRef.current;
    if (!composerElement || !listElement) return;

    const vv = window.visualViewport;
    let releaseTimer = 0;
    let restoreFrame = 0;
    let restoreActive = false;
    let restoreStartedAt = 0;
    let lastViewportChangeAt = 0;
    let lockedScrollTop = 0;
    let userInteracting = false;

    const clearRestore = () => {
      restoreActive = false;
      userInteracting = false;
      if (restoreFrame) {
        window.cancelAnimationFrame(restoreFrame);
        restoreFrame = 0;
      }
      if (releaseTimer) {
        window.clearTimeout(releaseTimer);
        releaseTimer = 0;
      }
    };

    const restoreScroll = () => {
      if (!restoreActive || userInteracting) return;
      if (Math.abs(listElement.scrollTop - lockedScrollTop) > 1) {
        listElement.scrollTop = lockedScrollTop;
      }

      const now = Date.now();
      const viewportSettled = keyboardOffset > 0 && now - lastViewportChangeAt > 120;
      const expired = now - restoreStartedAt > 1400;

      if (viewportSettled || expired) {
        clearRestore();
        return;
      }

      restoreFrame = window.requestAnimationFrame(restoreScroll);
    };

    const beginRestoreWindow = () => {
      clearRestore();
      lockedScrollTop = listElement.scrollTop;
      restoreActive = true;
      restoreStartedAt = Date.now();
      lastViewportChangeAt = restoreStartedAt;
      restoreFrame = window.requestAnimationFrame(restoreScroll);

      releaseTimer = window.setTimeout(() => {
        clearRestore();
      }, 1500);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        beginRestoreWindow();
      }
    };

    const onComposerTouchStart = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        beginRestoreWindow();
      }
    };

    const onViewportChange = () => {
      if (!restoreActive) return;
      lastViewportChangeAt = Date.now();
      restoreScroll();
    };

    const onListScroll = () => {
      restoreScroll();
    };

    const onUserStart = () => {
      if (!restoreActive) return;
      userInteracting = true;
      clearRestore();
    };

    composerElement.addEventListener('touchstart', onComposerTouchStart, { passive: true });
    composerElement.addEventListener('focusin', onFocusIn);
    listElement.addEventListener('scroll', onListScroll, { passive: true });
    listElement.addEventListener('touchstart', onUserStart, { passive: true });
    listElement.addEventListener('wheel', onUserStart, { passive: true });
    vv?.addEventListener('resize', onViewportChange);
    vv?.addEventListener('scroll', onViewportChange);

    return () => {
      clearRestore();
      composerElement.removeEventListener('touchstart', onComposerTouchStart);
      composerElement.removeEventListener('focusin', onFocusIn);
      listElement.removeEventListener('scroll', onListScroll);
      listElement.removeEventListener('touchstart', onUserStart);
      listElement.removeEventListener('wheel', onUserStart);
      vv?.removeEventListener('resize', onViewportChange);
      vv?.removeEventListener('scroll', onViewportChange);
    };
  }, [isMobile, keyboardOffset, open]);

  useEffect(() => {
    if (!isMobile || !open) {
      setComposerHeight(0);
      return;
    }
    const composerElement = composerRef.current;
    if (!composerElement) return;

    const updateHeight = () => {
      setComposerHeight(composerElement.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(composerElement);
    return () => observer.disconnect();
  }, [isMobile, open]);

  useEffect(() => {
    if (hasLoaded) {
      onCountChange?.(comments.length);
    }
  }, [comments.length, hasLoaded, onCountChange]);

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true);
    try {
      const response = await apiService.getPostComments(postId, 1, 50);
      setComments(Array.isArray(response.items) ? response.items : []);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to load comments:', error);
      toast.error('Failed to load comments.');
    } finally {
      setIsLoadingComments(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!hasLoaded) {
      void loadComments();
    }
  }, [hasLoaded, loadComments]);

  const handleCreate = useCallback(async () => {
    const content = newComment.trim();
    if (!commentsEnabled) { toast.error('Comments are turned off for this post.'); return; }
    if (!content) return;
    if (content.length > COMMENT_MAX_LENGTH) { toast.error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`); return; }

    const optimisticId = `temp-${Date.now()}`;
    const optimisticComment: PostComment = {
      commentId: optimisticId, postId, parentCommentId: null,
      userId: currentUserId || '', username: currentUsername || 'you', userAvatarUrl: null,
      content, createdAt: new Date().toISOString(), updatedAt: null,
      likeCount: 0, likedByCurrentUser: false, isOwnedByCurrentUser: true, canDelete: true,
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
      if (error instanceof ApiError && error.status === 403) toast.error('Comments are turned off for this post.');
      else if (error instanceof ApiError && error.status === 401) toast.error('Sign in again to comment.');
      else toast.error('Failed to add comment.');
    } finally {
      setIsCreating(false);
    }
  }, [commentsEnabled, currentUserId, currentUsername, newComment, postId, queryClient]);

  const cancelReply = useCallback(() => { setReplyingToCommentId(null); setReplyContent(''); }, []);

  const handleReply = useCallback(async (parentComment: PostComment) => {
    const content = replyContent.trim();
    if (!commentsEnabled) { toast.error('Comments are turned off for this post.'); return; }
    if (!content) return;
    if (content.length > COMMENT_MAX_LENGTH) { toast.error(`Replies can be up to ${COMMENT_MAX_LENGTH} characters.`); return; }

    const optimisticId = `temp-reply-${Date.now()}`;
    const optimisticReply: PostComment = {
      commentId: optimisticId, postId: parentComment.postId, parentCommentId: parentComment.commentId,
      userId: currentUserId || '', username: currentUsername || 'you', userAvatarUrl: null,
      content, createdAt: new Date().toISOString(), updatedAt: null,
      likeCount: 0, likedByCurrentUser: false, isOwnedByCurrentUser: true, canDelete: true,
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
      if (error instanceof ApiError && error.status === 403) toast.error('Comments are turned off for this post.');
      else if (error instanceof ApiError && error.status === 401) toast.error('Sign in again to reply.');
      else toast.error('Failed to add reply.');
    } finally {
      setIsReplying(false);
    }
  }, [cancelReply, commentsEnabled, currentUserId, currentUsername, replyContent, queryClient]);

  const startEdit = useCallback((comment: PostComment) => { setEditingCommentId(comment.commentId); setEditingContent(comment.content); }, []);
  const cancelEdit = useCallback(() => { setEditingCommentId(null); setEditingContent(''); }, []);

  const saveEdit = useCallback(async () => {
    if (!editingCommentId) return;
    const content = editingContent.trim();
    if (!content) return;
    if (content.length > COMMENT_MAX_LENGTH) { toast.error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`); return; }

    const previousComments = comments;
    setComments((prev) => prev.map((item) =>
      item.commentId === editingCommentId ? { ...item, content, updatedAt: new Date().toISOString() } : item
    ));
    cancelEdit();

    try {
      const updated = await apiService.updatePostComment(editingCommentId, content);
      setComments((prev) => prev.map((item) => (item.commentId === editingCommentId ? updated : item)));
    } catch (error) {
      setComments(previousComments);
      if (error instanceof ApiError && error.status === 401) toast.error('Sign in again to edit comments.');
      else toast.error('Failed to update comment.');
    }
  }, [cancelEdit, comments, editingCommentId, editingContent]);

  const handleDelete = useCallback(async (commentId: string) => {
    const previousComments = comments;
    setPendingDeleteId(commentId);
    setComments((prev) => prev.filter((item) => item.commentId !== commentId));

    try {
      await apiService.deletePostComment(commentId);
    } catch (error) {
      setComments(previousComments);
      if (error instanceof ApiError && error.status === 401) toast.error('Sign in again to delete comments.');
      else toast.error('Failed to delete comment.');
    } finally {
      setPendingDeleteId((prev) => (prev === commentId ? null : prev));
    }
  }, [comments]);

  const handleToggleCommentLike = useCallback(async (comment: PostComment) => {
    const commentId = comment.commentId;
    if (pendingLikeIds[commentId]) return;
    const nextLiked = !comment.likedByCurrentUser;
    const nextCount = Math.max(0, (comment.likeCount || 0) + (nextLiked ? 1 : -1));

    setPendingLikeIds((prev) => ({ ...prev, [commentId]: true }));
    setComments((prev) => prev.map((item) =>
      item.commentId === commentId ? { ...item, likedByCurrentUser: nextLiked, likeCount: nextCount } : item
    ));

    try {
      const response = nextLiked
        ? await apiService.likePostComment(commentId)
        : await apiService.unlikePostComment(commentId);
      setComments((prev) => prev.map((item) =>
        item.commentId === commentId
          ? { ...item, likedByCurrentUser: response.liked, likeCount: Math.max(0, response.likeCount) }
          : item
      ));
    } catch (error) {
      setComments((prev) => prev.map((item) =>
        item.commentId === commentId
          ? { ...item, likedByCurrentUser: comment.likedByCurrentUser, likeCount: comment.likeCount }
          : item
      ));
      if (error instanceof ApiError && error.status === 401) toast.error('Sign in again to like comments.');
      else toast.error('Failed to update comment like.');
    } finally {
      setPendingLikeIds((prev) => { const next = { ...prev }; delete next[commentId]; return next; });
    }
  }, [pendingLikeIds]);

  const remainingCharacters = COMMENT_MAX_LENGTH - newComment.length;
  const replyRemainingCharacters = COMMENT_MAX_LENGTH - replyContent.length;
  const canSubmit = newComment.trim().length > 0 && remainingCharacters >= 0 && commentsEnabled;
  const canSubmitReply = replyContent.trim().length > 0 && replyRemainingCharacters >= 0 && commentsEnabled;
  const hasComments = comments.length > 0;

  const thread = useMemo(() => {
    const roots: PostComment[] = [];
    const repliesByParent = new Map<string, PostComment[]>();
    comments.forEach((comment) => {
      const parentId = comment.parentCommentId ?? null;
      if (!parentId) { roots.push(comment); return; }
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
          'group rounded-lg p-2.5 sm:p-3 transition-colors duration-150',
          depth === 0
            ? 'bg-muted/30 hover:bg-muted/50'
            : 'hover:bg-muted/30'
        )}>
          <div className="flex gap-2.5">
            <Link href={`/profile/${comment.username}`} className="flex-shrink-0">
              <Avatar className={cn('ring-1 ring-border/50', depth === 0 ? 'size-7 sm:size-8' : 'size-6 sm:size-7')}>
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
                <div className="mt-2 flex flex-col gap-2">
                  <Textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    className="min-h-[72px] resize-none bg-card border-border/60"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} className="h-7 text-xs">
                      <X data-icon="inline-start" />
                      Cancel
                    </Button>
                    <Button type="button" size="sm" onClick={() => void saveEdit()} className="h-7 text-xs">
                      <Check data-icon="inline-start" />
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
                    onClick={() => void handleToggleCommentLike(comment)}
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
                        <Heart className={cn('size-3', comment.likedByCurrentUser ? 'fill-current' : 'fill-none')} />
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
                      if (isReplyingHere) { cancelReply(); return; }
                      setReplyingToCommentId(comment.commentId);
                      setReplyContent('');
                      if (isMobile) {
                        textareaRef.current?.focus({ preventScroll: true });
                      }
                    }}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors',
                      isReplyingHere ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                      'disabled:opacity-50'
                    )}
                  >
                    <MessageCircle className="size-3" />
                    <span>Reply</span>
                  </button>

                  <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    {comment.isOwnedByCurrentUser && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <Pencil className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                    )}
                    {comment.canDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            disabled={pendingDeleteId === comment.commentId}
                            onClick={() => void handleDelete(comment.commentId)}
                            className="rounded-full p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}

              <AnimatePresence>
                {isReplyingHere && !isMobile && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 flex flex-col gap-2 rounded-lg bg-background/60 p-3 border border-border/40">
                      <Textarea
                        value={replyContent}
                        onChange={(event) => setReplyContent(event.target.value)}
                        placeholder={`Reply to ${comment.username}...`}
                        disabled={isReplying || !commentsEnabled}
                        className="min-h-[64px] resize-none bg-card border-border/50 text-sm"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        {replyRemainingCharacters < CHAR_WARNING_THRESHOLD ? (
                          <span className={cn('text-xs tabular-nums', replyRemainingCharacters < 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                            {replyRemainingCharacters}
                          </span>
                        ) : <span />}
                        <div className="flex items-center gap-2">
                          <Button type="button" size="sm" variant="ghost" onClick={cancelReply} className="h-7 text-xs">Cancel</Button>
                          <Button type="button" size="sm" disabled={!canSubmitReply || isReplying} onClick={() => void handleReply(comment)} className="h-7 text-xs">Reply</Button>
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
                <ChevronDown className="size-3" />
                {children.length === 1 ? '1 reply' : `${children.length} replies`}
              </button>
            ) : (
              <div className="flex flex-col gap-1.5 mt-1.5">
                {visibleChildren.map((child) => renderCommentNode(child, depth + 1))}
                <div className="ml-6 sm:ml-10 flex items-center gap-3 py-1">
                  {hasHiddenReplies && (
                    <button
                      type="button"
                      onClick={() => setVisibleRepliesCount((prev) => ({
                        ...prev, [comment.commentId]: (prev[comment.commentId] ?? DEFAULT_VISIBLE_REPLIES) + DEFAULT_VISIBLE_REPLIES,
                      }))}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80 hover:text-primary transition-colors"
                    >
                      <ChevronDown className="size-3" />
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
                    <ChevronUp className="size-3" />
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

  const contentClasses = cn(
    'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 border-l border-border bg-background shadow-2xl',
    'sm:max-w-md md:max-w-lg',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full',
    'data-[state=open]:duration-[450ms] data-[state=closed]:duration-[300ms]',
    'data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)]',
    'data-[state=closed]:ease-[cubic-bezier(0.64,0,0.78,0)]',
    'will-change-transform',
  );

  const mobileReplyParent = isMobile && replyingToCommentId
    ? comments.find((c) => c.commentId === replyingToCommentId) ?? null
    : null;

  const composerValue = mobileReplyParent ? replyContent : newComment;
  const composerOnChange = mobileReplyParent ? setReplyContent : setNewComment;
  const composerBusy = mobileReplyParent ? isReplying : isCreating;
  const composerRemaining = mobileReplyParent ? replyRemainingCharacters : remainingCharacters;
  const composerCanSubmit = mobileReplyParent ? canSubmitReply : canSubmit;
  const composerPlaceholder = !commentsEnabled
    ? 'Comments are turned off'
    : mobileReplyParent
      ? `Reply to ${mobileReplyParent.username}...`
      : 'Share your thoughts...';
  const composerSubmitLabel = mobileReplyParent
    ? (isReplying ? 'Sending...' : 'Reply')
    : (isCreating ? 'Sending...' : 'Comment');
  const composerOnSubmit = mobileReplyParent
    ? () => void handleReply(mobileReplyParent)
    : () => void handleCreate();

  const showComposerFooter = composerRemaining < CHAR_WARNING_THRESHOLD || !commentsEnabled;

  const composer = (
    <div className="flex flex-col gap-1">
      {mobileReplyParent && (
        <div
          key="reply-indicator"
          className="flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1"
        >
          <MessageCircle className="size-3 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            Replying to <span className="font-semibold text-foreground">@{mobileReplyParent.username}</span>
          </span>
          <button
            type="button"
            onClick={cancelReply}
            className="ml-auto rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Cancel reply"
          >
            <X className="size-3" />
          </button>
        </div>
      )}
      <div key="composer-field" className="relative">
        <Textarea
          key="composer-textarea"
          ref={textareaRef}
          onPointerDown={handleTextareaPointerDown}
          value={composerValue}
          onChange={(event) => composerOnChange(event.target.value)}
          placeholder={composerPlaceholder}
          disabled={composerBusy || !commentsEnabled}
          className="min-h-[64px] resize-none bg-card border-border/60 pr-11 text-sm placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={composerOnSubmit}
          disabled={!composerCanSubmit || composerBusy}
          aria-label={composerSubmitLabel}
          className={cn(
            'absolute bottom-1.5 right-1.5 flex size-8 items-center justify-center rounded-full transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
            'disabled:opacity-40 disabled:pointer-events-none',
          )}
        >
          {composerBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      </div>
      {showComposerFooter && (
        <div key="composer-footer" className="px-1">
          {composerRemaining < CHAR_WARNING_THRESHOLD ? (
            <span className={cn('text-xs tabular-nums', composerRemaining < 0 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
              {composerRemaining} characters remaining
            </span>
          ) : !commentsEnabled ? (
            <span className="text-xs text-muted-foreground">Comments are disabled for this post.</span>
          ) : null}
        </div>
      )}
    </div>
  );

  const header = (
    <div className="flex items-center gap-2 px-3 sm:px-5 pt-3.5 pb-2.5 sm:pt-5 sm:pb-3 border-b border-border">
      <MessageSquare className="size-4 text-muted-foreground" />
      <span className="font-atkinson text-sm font-bold text-foreground tracking-wide">Comments</span>
      {hasComments && (
        <Badge variant="secondary" className="text-xs font-atkinson tracking-wide">
          {comments.length}
        </Badge>
      )}
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="ml-auto rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Close comments"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );

  const commentsList = (
    <div className="flex flex-col gap-1.5 sm:gap-2">
      {isLoadingComments && !hasLoaded && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="size-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading comments...</p>
        </div>
      )}
      {!isLoadingComments && !hasComments && (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <div className="rounded-full bg-muted/40 p-3">
            <MessageSquare className="size-5 text-muted-foreground/60" />
          </div>
          <p className="text-sm text-muted-foreground">No comments yet</p>
          {commentsEnabled && (
            <p className="text-xs text-muted-foreground/60">Be the first to share your thoughts</p>
          )}
        </div>
      )}
      {thread.roots.map((comment) => renderCommentNode(comment))}
    </div>
  );

  if (isMobile) {
    if (!hasMounted || !open) return null;

    return createPortal(
      <>
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => onOpenChange(false)}
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 z-[60] overflow-hidden pointer-events-none"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Comments"
            className="flex h-full flex-col"
          >
            <button
              type="button"
              aria-label="Close comments"
              onClick={() => onOpenChange(false)}
              className="pointer-events-auto block h-[15%] w-full bg-transparent"
            />
            <div className="pointer-events-auto relative flex flex-1 flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl">
              {header}
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4"
                style={{ paddingBottom: Math.max(0, composerHeight - keyboardOffset) }}
              >
                {commentsList}
              </div>
              <div
                ref={composerRef}
                style={keyboardOffset > 0 ? { paddingBottom: keyboardOffset } : undefined}
                className={cn(
                  'absolute inset-x-0 bottom-0 z-10 border-t border-border bg-background px-3 py-2.5',
                  keyboardOffset === 0 && 'pb-[max(0.625rem,env(safe-area-inset-bottom))]',
                )}
              >
                {composer}
              </div>
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className={contentClasses}
          onInteractOutside={(event) => {
            // Desktop: panel stays open during any outside interaction so the
            // page remains fully clickable. Only the X button or re-clicking
            // the trigger closes it.
            event.preventDefault();
          }}
          onFocusOutside={(event) => {
            event.preventDefault();
          }}
        >
          <DialogPrimitive.Title className="sr-only">Comments</DialogPrimitive.Title>
          {header}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
            {commentsList}
          </div>

          {/* Desktop: input pinned inside the side panel */}
          <div className="border-t border-border bg-background/80 backdrop-blur-sm px-3 sm:px-5 py-2.5 sm:py-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            {composer}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
