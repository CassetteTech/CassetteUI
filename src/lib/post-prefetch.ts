import type { PostByIdResponse } from '@/types';

/**
 * Warm handoff between the inline conversion surfaces (home, add-music) and
 * /post/[id]: the converting page fetches the finished post while its beam
 * is still running, stashes it here, and navigates. The post page consumes
 * the stashed payload synchronously instead of re-fetching, so the user
 * lands on real content with no skeleton phase.
 *
 * sessionStorage (not memory) so the payload survives the route transition
 * regardless of bundle splitting, and dies with the tab.
 */
const KEY_PREFIX = 'cassette:prefetched-post:';

export function savePrefetchedPost(postId: string, post: PostByIdResponse): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + postId, JSON.stringify(post));
  } catch {
    // Storage full/unavailable — the post page falls back to fetching.
  }
}

/** Returns the stashed payload for this post id (single use), or null. */
export function takePrefetchedPost(postId: string): PostByIdResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + postId);
    if (!raw) return null;
    sessionStorage.removeItem(KEY_PREFIX + postId);
    const parsed = JSON.parse(raw) as PostByIdResponse;
    return parsed?.success ? parsed : null;
  } catch {
    return null;
  }
}
