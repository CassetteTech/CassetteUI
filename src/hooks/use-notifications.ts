import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/services/api';
import {
  NotificationItem,
  NotificationListResponse,
  NotificationType,
  NotificationUnreadCountResponse,
} from '@/types';

type NotificationQueryParams = {
  page?: number;
  pageSize?: number;
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  refetchInBackground?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

type NotificationUnreadCountQueryParams = {
  enabled?: boolean;
  refetchIntervalMs?: number | false;
  refetchInBackground?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

const toStringOrUndefined = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim() !== '') return value;
  return undefined;
};

const toBooleanOrDefault = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toType = (value: unknown): NotificationType => {
  const normalized = typeof value === 'string' ? value.toLowerCase() : '';
  if (normalized === 'like') return 'like';
  if (normalized === 'comment') return 'comment';
  if (normalized === 'comment_reply' || normalized === 'commentreply') return 'comment_reply';
  if (normalized === 'comment_like' || normalized === 'commentlike') return 'comment_like';
  if (normalized === 'repost') return 'repost';
  if (normalized === 'follow') return 'follow';
  return 'system';
};

const toNotificationItem = (raw: unknown): NotificationItem => {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const actorSource =
    source.actor && typeof source.actor === 'object'
      ? (source.actor as Record<string, unknown>)
      : {};

  return {
    id: String(source.id ?? source.notificationId ?? source.NotificationId ?? ''),
    type: toType(source.type ?? source.notificationType ?? source.NotificationType),
    isRead: toBooleanOrDefault(source.isRead ?? source.IsRead, false),
    createdAt: String(source.createdAt ?? source.CreatedAt ?? ''),
    actor: {
      userId: toStringOrUndefined(actorSource.userId ?? actorSource.UserId),
      username: toStringOrUndefined(actorSource.username ?? actorSource.Username),
      displayName: toStringOrUndefined(actorSource.displayName ?? actorSource.DisplayName),
      avatarUrl: toStringOrUndefined(actorSource.avatarUrl ?? actorSource.AvatarUrl),
    },
    postId: toStringOrUndefined(source.postId ?? source.PostId),
    targetUrl: toStringOrUndefined(source.targetUrl ?? source.TargetUrl),
    message: toStringOrUndefined(source.message ?? source.Message),
  };
};

const toNotificationList = (
  raw: unknown,
  page: number,
  pageSize: number
): NotificationListResponse => {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const sourceItems = source.items ?? source.Items ?? [];
  const items = Array.isArray(sourceItems)
    ? sourceItems.map(toNotificationItem).filter((item) => item.id !== '')
    : [];

  const unreadCountRaw = source.unreadCount ?? source.UnreadCount;
  const unreadCount =
    typeof unreadCountRaw === 'number'
      ? Math.max(0, unreadCountRaw)
      : items.filter((item) => !item.isRead).length;

  const totalItemsRaw = source.totalItems ?? source.TotalItems;
  const totalItems =
    typeof totalItemsRaw === 'number' ? totalItemsRaw : items.length;

  const totalPagesRaw = source.totalPages ?? source.TotalPages;
  const totalPages =
    typeof totalPagesRaw === 'number'
      ? totalPagesRaw
      : Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));

  const responsePage = source.page ?? source.Page;
  const responsePageSize = source.pageSize ?? source.PageSize;

  return {
    items,
    page: typeof responsePage === 'number' ? responsePage : page,
    pageSize: typeof responsePageSize === 'number' ? responsePageSize : pageSize,
    totalItems,
    totalPages,
    hasNext:
      typeof source.hasNext === 'boolean'
        ? source.hasNext
        : typeof source.HasNext === 'boolean'
          ? source.HasNext
          : page < totalPages,
    hasPrevious:
      typeof source.hasPrevious === 'boolean'
        ? source.hasPrevious
        : typeof source.HasPrevious === 'boolean'
          ? source.HasPrevious
          : page > 1,
    unreadCount,
  };
};

const toUnreadCountResponse = (raw: unknown): NotificationUnreadCountResponse => {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const unreadCountRaw = source.unreadCount ?? source.UnreadCount;

  return {
    unreadCount: typeof unreadCountRaw === 'number' ? Math.max(0, unreadCountRaw) : 0,
  };
};

export const notificationQueryKeys = {
  list: (page = DEFAULT_PAGE, pageSize = DEFAULT_PAGE_SIZE) =>
    ['notifications', page, pageSize] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

export const useNotifications = ({
  page = DEFAULT_PAGE,
  pageSize = DEFAULT_PAGE_SIZE,
  enabled = true,
  refetchIntervalMs = false,
  refetchInBackground = true,
  refetchOnWindowFocus = true,
  refetchOnReconnect = true,
}: NotificationQueryParams = {}) => {
  return useQuery({
    queryKey: notificationQueryKeys.list(page, pageSize),
    queryFn: async () => {
      const response = await apiService.getNotifications(page, pageSize);
      return toNotificationList(response, page, pageSize);
    },
    enabled,
    refetchInterval: enabled ? refetchIntervalMs : false,
    refetchIntervalInBackground: refetchInBackground,
    refetchOnWindowFocus: enabled && refetchOnWindowFocus,
    refetchOnReconnect: enabled && refetchOnReconnect,
  });
};

export const useUnreadNotificationCount = ({
  enabled = true,
  refetchIntervalMs = false,
  refetchInBackground = false,
  refetchOnWindowFocus = false,
  refetchOnReconnect = false,
}: NotificationUnreadCountQueryParams = {}) => {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: async () => {
      const response = await apiService.getUnreadNotificationCount();
      return toUnreadCountResponse(response);
    },
    enabled,
    refetchInterval: enabled ? refetchIntervalMs : false,
    refetchIntervalInBackground: refetchInBackground,
    refetchOnWindowFocus: enabled && refetchOnWindowFocus,
    refetchOnReconnect: enabled && refetchOnReconnect,
  });
};

const isNotificationListResponse = (value: unknown): value is NotificationListResponse => {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray((value as { items?: unknown }).items);
};

const patchNotificationCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  update: (item: NotificationItem) => NotificationItem
) => {
  const cachedEntries = queryClient.getQueriesData<unknown>({
    queryKey: ['notifications'],
  });

  cachedEntries.forEach(([cacheKey, cacheValue]) => {
    if (!isNotificationListResponse(cacheValue)) return;

    const nextItems = cacheValue.items.map(update);
    const unreadCount = nextItems.filter((item) => !item.isRead).length;
    queryClient.setQueryData<NotificationListResponse>(cacheKey, {
      ...cacheValue,
      items: nextItems,
      unreadCount,
    });
  });
};

const patchUnreadCountCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  update: (unreadCount: number) => number
) => {
  const cachedUnreadCount = queryClient.getQueryData<NotificationUnreadCountResponse>(
    notificationQueryKeys.unreadCount()
  );
  if (!cachedUnreadCount) return;

  queryClient.setQueryData<NotificationUnreadCountResponse>(
    notificationQueryKeys.unreadCount(),
    {
      unreadCount: Math.max(0, update(cachedUnreadCount.unreadCount)),
    }
  );
};

const getUnreadSelectionCount = (
  queryClient: ReturnType<typeof useQueryClient>,
  notificationIds: string[]
) => {
  const unreadIds = new Set<string>();
  const cachedEntries = queryClient.getQueriesData<unknown>({
    queryKey: ['notifications'],
  });

  cachedEntries.forEach(([, cacheValue]) => {
    if (!isNotificationListResponse(cacheValue)) return;

    cacheValue.items.forEach((item) => {
      if (!item.isRead && notificationIds.includes(item.id)) {
        unreadIds.add(item.id);
      }
    });
  });

  return unreadIds.size > 0 ? unreadIds.size : notificationIds.length;
};

export const useMarkNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds: string[]) => apiService.markNotificationsAsRead(notificationIds),
    onMutate: async (notificationIds) => {
      if (!notificationIds || notificationIds.length === 0) return;

      const unreadSelectionCount = getUnreadSelectionCount(queryClient, notificationIds);

      patchNotificationCache(queryClient, (item) =>
        notificationIds.includes(item.id) ? { ...item, isRead: true } : item
      );
      patchUnreadCountCache(queryClient, (unreadCount) => unreadCount - unreadSelectionCount);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useMarkAllNotificationsAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiService.markAllNotificationsAsRead(),
    onMutate: async () => {
      patchNotificationCache(queryClient, (item) => ({ ...item, isRead: true }));
      patchUnreadCountCache(queryClient, () => 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
