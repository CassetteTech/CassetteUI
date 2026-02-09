import { ActivityPost } from '@/types';
import { apiService } from '@/services/api';
import { profileService } from '@/services/profile';

const CACHE_KEY = 'profile_artwork_cache_v1';
const PREFETCH_SESSION_KEY = 'profile_artwork_prefetched_users_v1';
const MAX_CACHE_ENTRIES = 300;

const memoryCache = new Map<string, string>();
const inFlightPrefetch = new Set<string>();
let hydratedFromStorage = false;
let prefetchedUsersHydrated = false;
const prefetchedUsers = new Set<string>();

function resolveText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function resolvePostArtwork(post: {
  details?: { coverArtUrl?: string; imageUrl?: string };
  platforms?: Record<string, { artworkUrl?: string; imageUrl?: string; coverArtUrl?: string }>;
}) {
  if (post.details?.coverArtUrl) return post.details.coverArtUrl;
  if (post.details?.imageUrl) return post.details.imageUrl;

  if (post.platforms) {
    for (const platform of Object.values(post.platforms)) {
      const artwork = resolveText(platform?.artworkUrl, platform?.imageUrl, platform?.coverArtUrl);
      if (artwork) return artwork;
    }
  }

  return undefined;
}

function hydrateFromStorage() {
  if (hydratedFromStorage || typeof window === 'undefined') return;
  hydratedFromStorage = true;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as Array<[string, string]>;
    for (const [postId, artworkUrl] of entries) {
      if (postId && artworkUrl) {
        memoryCache.set(postId, artworkUrl);
      }
    }
  } catch {
    // ignore malformed cache entries
  }
}

function persistToStorage() {
  if (typeof window === 'undefined') return;
  try {
    const entries = Array.from(memoryCache.entries()).slice(-MAX_CACHE_ENTRIES);
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage quota/private mode failures
  }
}

function hydratePrefetchedUsers() {
  if (prefetchedUsersHydrated || typeof window === 'undefined') return;
  prefetchedUsersHydrated = true;

  try {
    const raw = sessionStorage.getItem(PREFETCH_SESSION_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as string[];
    for (const entry of entries) {
      if (entry) prefetchedUsers.add(entry);
    }
  } catch {
    // ignore malformed values
  }
}

function persistPrefetchedUsers() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PREFETCH_SESSION_KEY, JSON.stringify(Array.from(prefetchedUsers)));
  } catch {
    // ignore storage quota/private mode failures
  }
}

function setArtwork(postId: string, artworkUrl: string) {
  if (!postId || !artworkUrl) return;
  hydrateFromStorage();
  memoryCache.delete(postId);
  memoryCache.set(postId, artworkUrl);

  while (memoryCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    memoryCache.delete(oldestKey);
  }

  persistToStorage();
}

export function seedArtworkCache(postId: string | undefined, artworkUrl: string | undefined) {
  if (!postId || !artworkUrl) return;
  const normalized = artworkUrl.trim();
  if (!normalized) return;
  setArtwork(postId, normalized);
}

function getArtwork(postId: string) {
  if (!postId) return undefined;
  return memoryCache.get(postId);
}

export function applyCachedArtwork(posts: ActivityPost[]): ActivityPost[] {
  if (!posts.length) return posts;
  hydrateFromStorage();

  return posts.map((post) => {
    if (post.imageUrl || !post.postId) return post;
    const cached = getArtwork(post.postId);
    return cached ? { ...post, imageUrl: cached } : post;
  });
}

export async function prefetchProfileArtwork(
  userIdentifier: string,
  options: { pageSize?: number; maxBackfill?: number } = {},
) {
  const pageSize = options.pageSize ?? 20;
  const maxBackfill = options.maxBackfill ?? 8;
  const key = `${userIdentifier}:${pageSize}:${maxBackfill}`;

  hydratePrefetchedUsers();
  if (!userIdentifier || inFlightPrefetch.has(key) || prefetchedUsers.has(userIdentifier)) return;
  inFlightPrefetch.add(key);

  try {
    const activity = await profileService.fetchUserActivity(userIdentifier, { page: 1, pageSize });
    const candidates = activity.items
      .filter((post) => {
        if (!post.postId || post.imageUrl || getArtwork(post.postId)) return false;
        return post.elementType?.toLowerCase() !== 'playlist';
      })
      .slice(0, maxBackfill);

    if (!candidates.length) return;

    await Promise.all(
      candidates.map(async (post) => {
        try {
          const supportsAbortTimeout =
            typeof AbortSignal !== 'undefined' &&
            typeof (AbortSignal as typeof AbortSignal & { timeout?: (ms: number) => AbortSignal }).timeout === 'function';

          const signal = supportsAbortTimeout
            ? (AbortSignal as typeof AbortSignal & { timeout: (ms: number) => AbortSignal }).timeout(2000)
            : undefined;

          const result = await apiService.fetchPostById(
            post.postId,
            signal ? { signal } : undefined,
          );

          const artwork = resolvePostArtwork(result);
          if (artwork) {
            setArtwork(post.postId, artwork);
          }
        } catch {
          // Best-effort cache warmup only
        }
      }),
    );
  } finally {
    prefetchedUsers.add(userIdentifier);
    persistPrefetchedUsers();
    inFlightPrefetch.delete(key);
  }
}
