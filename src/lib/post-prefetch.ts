import type { PostByIdResponse } from '@/types';
import { tryStorage } from './best-effort';

const KEY_PREFIX = 'cassette:prefetched-post:';

type PrefetchedPostEntry = { viewerId: string | null; post: PostByIdResponse };

const isPublicPost = (post: PostByIdResponse) => !post.privacy || post.privacy.trim().toLowerCase() === 'public';

/** `viewerId` is the account the read was made for, or null when no account was known. */
export function savePrefetchedPost(postId: string, post: PostByIdResponse, viewerId: string | null): void {
  const {
    paidPromotionCampaignId: _paidPromotionAttribution,
    curatorId: _curatorAttribution,
    isMemberView: _memberViewAttribution,
    ...cacheablePost
  } = post;
  const entry: PrefetchedPostEntry = { viewerId, post: cacheablePost };
  tryStorage(() => sessionStorage.setItem(KEY_PREFIX + postId, JSON.stringify(entry)), undefined);
}

/**
 * The stashed post, only for the account that read it. A read made with no known account may
 * have carried a session cookie, so it serves only a public post.
 */
export function takePrefetchedPost(postId: string, viewerId: string | null): PostByIdResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + postId);
    if (!raw) return null;
    sessionStorage.removeItem(KEY_PREFIX + postId);
    // SAFETY: the entry is written only by savePrefetchedPost; every field read below is checked.
    const entry = JSON.parse(raw) as Partial<PrefetchedPostEntry> | null;
    if (!entry?.post?.success || entry.viewerId === undefined || entry.viewerId !== viewerId) return null;
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
