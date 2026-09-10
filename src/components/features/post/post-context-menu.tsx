'use client';

/** Right-click quick actions for a post: listen links, share, engagement, and owner tools. */

import Image from 'next/image';
import {
  AlertCircle,
  Heart,
  MessageSquare,
  Pencil,
  Plus,
  Repeat2,
  Share2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { streamingServices } from '@/components/features/entity/streaming-links';
import { handleStreamingLinkClick } from '@/utils/deep-link';
import type { MusicLinkConversion } from '@/types';

const listenKeys = ['spotify', 'appleMusic', 'deezer'] as const;

interface PostContextMenuProps {
  title: string;
  links: MusicLinkConversion['convertedUrls'];
  /** Analytics hook; the item itself is a real link so deep links and new tabs behave like the Listen buttons. */
  onListen: (url: string, platform: (typeof listenKeys)[number]) => void;
  onShare: () => void;
  liked: boolean;
  onToggleLike: () => void;
  onOpenComments?: () => void;
  canRepost: boolean;
  hasReposted: boolean;
  onRepost: () => void;
  canAddToProfile: boolean;
  onAddToProfile: () => void;
  onReport: () => void;
  isOwner: boolean;
  onEdit: () => void;
  onOpenStudio: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export function PostContextMenu({
  title,
  links,
  onListen,
  onShare,
  liked,
  onToggleLike,
  onOpenComments,
  canRepost,
  hasReposted,
  onRepost,
  canAddToProfile,
  onAddToProfile,
  onReport,
  isOwner,
  onEdit,
  onOpenStudio,
  onDelete,
  children,
}: PostContextMenuProps) {
  const listen = listenKeys.flatMap((key) => {
    const url = links[key]?.trim();
    return url ? [[key, url] as const] : [];
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent data-testid="post-context-menu" className="min-w-[14rem]">
        <ContextMenuLabel className="truncate normal-case tracking-normal text-foreground">{title}</ContextMenuLabel>
        {listen.length > 0 && (
          <>
            <ContextMenuSeparator />
            {listen.map(([key, url]) => {
              const service = streamingServices[key];
              return (
                <ContextMenuItem key={key} asChild>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => {
                      onListen(url, key);
                      handleStreamingLinkClick(event, url);
                    }}
                  >
                    <Image src={service.icon} alt="" width={16} height={16} className="size-4" />
                    <span>Listen on {service.name}</span>
                  </a>
                </ContextMenuItem>
              );
            })}
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onShare}>
          <Share2 />
          <span>Share</span>
          <ContextMenuShortcut>Copy link</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={onToggleLike}>
          <Heart className={liked ? 'fill-current text-primary' : undefined} />
          <span>{liked ? 'Unlike' : 'Like'}</span>
        </ContextMenuItem>
        {onOpenComments && (
          <ContextMenuItem onSelect={onOpenComments}>
            <MessageSquare />
            <span>Comments</span>
          </ContextMenuItem>
        )}
        {canRepost && (
          <ContextMenuItem onSelect={onRepost}>
            <Repeat2 />
            <span>{hasReposted ? 'Remove repost' : 'Repost'}</span>
          </ContextMenuItem>
        )}
        {canAddToProfile && (
          <ContextMenuItem onSelect={onAddToProfile}>
            <Plus />
            <span>Add to profile</span>
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onReport}>
          <AlertCircle />
          <span>Report a problem</span>
        </ContextMenuItem>
        {isOwner && (
          <>
            <ContextMenuSeparator />
            <ContextMenuLabel>Your post</ContextMenuLabel>
            <ContextMenuItem onSelect={onEdit}>
              <Pencil />
              <span>Edit</span>
            </ContextMenuItem>
            <ContextMenuItem onSelect={onOpenStudio}>
              <SlidersHorizontal />
              <span>Access &amp; insights</span>
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
