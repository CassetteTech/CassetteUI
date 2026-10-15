import type { PostByIdResponse } from '@/types';
import { tryStorage } from './best-effort';

const KEY_PREFIX = 'cassette:prefetched-post:';

export function savePrefetchedPost(postId: string, post: PostByIdResponse): void {
  const {
    paidPromotionCampaignId: _paidPromotionAttribution,
    curatorId: _curatorAttribution,
    isMemberView: _memberViewAttribution,
    ...cacheablePost
  } = post;
  tryStorage(() => sessionStorage.setItem(KEY_PREFIX + postId, JSON.stringify(cacheablePost)), undefined);
}

export function takePrefetchedPost(postId: string): PostByIdResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + postId);
    if (!raw) return null;
    sessionStorage.removeItem(KEY_PREFIX + postId);
    const parsed = JSON.parse(raw) as PostByIdResponse;
    if (!parsed?.success) return null;

    const {
      paidPromotionCampaignId: _paidPromotionAttribution,
      curatorId: _curatorAttribution,
      isMemberView: _memberViewAttribution,
      ...cachedPost
    } = parsed;
    return cachedPost as PostByIdResponse;
  } catch {
    return null;
  }
}
