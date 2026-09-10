'use client';

/** Right-click quick actions for a post card in a list: open, share, and owner visibility, edit, delete. */

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ExternalLink, Pencil, Share, Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useUpdatePost } from '@/hooks/use-music';
import type { PostPrivacy } from '@/types';

export type QuickVisibility = Extract<PostPrivacy, 'public' | 'subscriber' | 'private'>;

const visibilityLabels = {
  public: 'Public',
  subscriber: 'Members only',
  private: 'Private',
} satisfies Record<QuickVisibility, string>;

interface PostQuickActionsProps {
  postId: string;
  title: string;
  href: string;
  onShare: () => void;
  isOwner: boolean;
  privacy: string | undefined;
  /** Which visibilities this list can show; a list that only ever renders public and members-only omits private. */
  visibilities: readonly QuickVisibility[];
  canLockPosts: boolean;
  onEdit: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function PostQuickActions({
  postId,
  title,
  href,
  onShare,
  isOwner,
  privacy,
  visibilities,
  canLockPosts,
  onEdit,
  onDelete,
  children,
}: PostQuickActionsProps) {
  const router = useRouter();
  const updatePost = useUpdatePost();
  const current = privacy?.toLowerCase() ?? 'public';

  const setVisibility = (next: QuickVisibility) => {
    if (next === current || updatePost.isPending) return;
    updatePost.mutate({ postId, privacy: next }, {
      onSuccess: () => toast.success(next === 'subscriber' ? 'Post locked for members.' : 'Post visibility updated.'),
      onError: () => toast.error('Failed to update post visibility. Please try again.'),
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent data-testid="post-quick-actions" className="min-w-[13rem]">
        <ContextMenuLabel className="truncate normal-case tracking-normal text-foreground">{title}</ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => router.push(href)}>
          <ExternalLink />
          <span>Open post</span>
        </ContextMenuItem>
        <ContextMenuItem onSelect={onShare}>
          <Share />
          <span>Share</span>
        </ContextMenuItem>
        {isOwner && (
          <>
            <ContextMenuSeparator />
            <ContextMenuLabel>Visibility</ContextMenuLabel>
            {visibilities.map((value) => {
              const active = current === value;
              const disabled = value === 'subscriber' && !canLockPosts && !active;
              return (
                <ContextMenuItem
                  key={value}
                  disabled={disabled}
                  onSelect={() => setVisibility(value)}
                  className="pl-7"
                >
                  {active && <Check className="absolute left-2" />}
                  <span>{visibilityLabels[value]}</span>
                  {disabled && <span className="ml-auto pl-4 text-[10px] text-muted-foreground">Needs Pro plan</span>}
                </ContextMenuItem>
              );
            })}
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onEdit}>
              <Pencil />
              <span>Edit</span>
            </ContextMenuItem>
            <ContextMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 />
              <span>Delete</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
