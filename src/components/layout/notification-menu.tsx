'use client';

import Link from 'next/link';
import { Inbox, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationsAsRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { NotificationItem } from '@/types';
import { formatRelativeTime } from '@/lib/utils/format-date';
import { cn } from '@/lib/utils';

const getNotificationText = (item: NotificationItem) => {
  const actor = item.actor.displayName || item.actor.username || 'Someone';
  if (item.message && item.message.trim() !== '') return item.message;
  if (item.type === 'like') return `${actor} liked your post`;
  if (item.type === 'comment') return `${actor} commented on your post`;
  if (item.type === 'comment_reply') return `${actor} replied to your comment`;
  if (item.type === 'comment_like') return `${actor} liked your comment`;
  if (item.type === 'follow') return `${actor} started following you`;
  return `${actor} sent you a notification`;
};

const getNotificationHref = (item: NotificationItem) => {
  if (item.targetUrl) return item.targetUrl;
  if (item.postId) return `/post/${item.postId}`;
  return '/profile';
};

export function NotificationMenu() {
  const { data, isLoading, isError } = useNotifications({ enabled: true, refetchIntervalMs: false });
  const { mutate: markAsRead, isPending: isMarkingSingle } = useMarkNotificationsAsRead();
  const { mutate: markAllAsRead, isPending: isMarkingAll } = useMarkAllNotificationsAsRead();

  const unreadCount = data?.unreadCount ?? 0;
  const hasUnread = unreadCount > 0;
  const notifications = data?.items ?? [];
  const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/30 bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Notifications"
        >
          <Inbox className="h-4 w-4" />
          {hasUnread && (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-atkinson font-bold">Notifications</DropdownMenuLabel>
          <button
            type="button"
            onClick={() => {
              if (unreadIds.length > 0) markAllAsRead();
            }}
            disabled={!hasUnread || isMarkingAll}
            className={cn(
              'text-xs font-medium text-primary transition-opacity',
              (!hasUnread || isMarkingAll) && 'opacity-50'
            )}
          >
            {isMarkingAll ? 'Marking...' : 'Mark all read'}
          </button>
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading notifications...
          </div>
        ) : isError ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Could not load notifications.
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        ) : (
          notifications.slice(0, 10).map((item) => {
            const actorName = item.actor.displayName || item.actor.username || 'N';

            return (
              <DropdownMenuItem
                key={item.id}
                asChild
                className={cn('cursor-pointer py-2.5', !item.isRead && 'bg-primary/5')}
              >
                <Link
                  href={getNotificationHref(item)}
                  onClick={() => {
                    if (!item.isRead && !isMarkingSingle) {
                      markAsRead([item.id]);
                    }
                  }}
                  className="flex items-start gap-3"
                >
                  <Avatar className="h-8 w-8 border border-border/40">
                    <AvatarImage src={item.actor.avatarUrl} alt={actorName} />
                    <AvatarFallback className="text-xs">
                      {actorName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{getNotificationText(item)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
