import type { PostByIdResponse } from '@/types';
import { useAuthStore } from '../stores/auth-store';
import { tryStorage } from './best-effort';

const KEY_PREFIX = 'cassette:prefetched-post:';

/** A stash serves only the handoff from a conversion to its post page, which takes seconds. */
export const PREFETCHED_POST_MAX_AGE_MS = 60_000;

type PrefetchedPostEntry = { viewerId: string | null; savedAt: number; post: PostByIdResponse };

const isPublicPost = (post: PostByIdResponse) => !post.privacy || post.privacy.trim().toLowerCase() === 'public';

const currentViewerId = () => useAuthStore.getState().user?.id ?? null;

function clearPrefetchedPosts() {
  tryStorage(() => {
    const keys = Array.from({ length: sessionStorage.length }, (_, index) => sessionStorage.key(index));
    for (const key of keys) {
      if (key?.startsWith(KEY_PREFIX)) sessionStorage.removeItem(key);
    }
  }, undefined);
}

// Counts account changes, so a read that spans A to B and back to A is still detected.
// Each change also drops every stash, which belonged to the previous account.
let sessionGeneration = 0;
useAuthStore.subscribe((state, previous) => {
  if ((state.user?.id ?? null) === (previous.user?.id ?? null)) return;
  sessionGeneration += 1;
  clearPrefetchedPosts();
});

/**
 * Call immediately before a post read whose response may be stashed. The returned save
 * keeps the response only when the account is unchanged since the read started and
 * `isCurrent` reports that the page that made the read is still on screen.
 */
export function startPrefetchRead(isCurrent: () => boolean) {
  const viewerId = currentViewerId();
  const generation = sessionGeneration;
  return (postId: string, post: PostByIdResponse) => {
    if (!isCurrent() || generation !== sessionGeneration || viewerId !== currentViewerId()) return;
    const {
      paidPromotionCampaignId: _paidPromotionAttribution,
      curatorId: _curatorAttribution,
      isMemberView: _memberViewAttribution,
      ...cacheablePost
    } = post;
    const entry: PrefetchedPostEntry = { viewerId, savedAt: Date.now(), post: cacheablePost };
    tryStorage(() => sessionStorage.setItem(KEY_PREFIX + postId, JSON.stringify(entry)), undefined);
  };
}

/**
 * The stashed post, only for the account that read it and within its maximum age. A read made
 * with no known account may have carried a session cookie, so it serves only a public post.
 */
export function takePrefetchedPost(postId: string, viewerId: string | null): PostByIdResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + postId);
    if (!raw) return null;
    sessionStorage.removeItem(KEY_PREFIX + postId);
    // SAFETY: the entry is written only by startPrefetchRead; every field read below is checked.
    const entry = JSON.parse(raw) as Partial<PrefetchedPostEntry> | null;
    if (!entry?.post?.success || entry.viewerId === undefined || entry.viewerId !== viewerId) return null;
    const age = Date.now() - (entry.savedAt ?? Number.NaN);
    if (!(age >= 0 && age <= PREFETCHED_POST_MAX_AGE_MS)) return null;
    const { post } = entry;
    if (viewerId === null && !isPublicPost(post)) return null;

    const {
      paidPromotionCampaignId: _paidPromotionAttribution,
      curatorId: _curatorAttribution,
      isMemberView: _memberViewAttribution,
      ...cachedPost
    } = post;
    // SAFETY: the rest of a stored PostByIdResponse, with only the attribution fields removed.
    return cachedPost as PostByIdResponse;
  } catch {
    return null;
  }
}
