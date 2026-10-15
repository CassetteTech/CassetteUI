import type { ActivityPost, PaginatedActivityResponse } from '@/types';

export function patchMusicPages<T extends { pages: PaginatedActivityResponse[] }>(
  data: T,
  postId: string,
  change: Partial<ActivityPost> | null,
  listPrivacy: string,
): T {
  let removed = false;
  const pages = data.pages.map((page) => ({
    ...page,
    items: page.items.flatMap((post) => {
      if (post.postId !== postId) return [post];
      const next = change && { ...post, ...change };
      if (next && (listPrivacy === 'all' || next.privacy === listPrivacy)) return [next];
      removed = true;
      return [];
    }),
  }));
  if (!removed) return { ...data, pages };
  return { ...data, pages: pages.map((page) => ({ ...page, totalItems: Math.max(0, page.totalItems - 1) })) };
}

export function uniquePosts(pages: readonly PaginatedActivityResponse[]) {
  const seen = new Set<string>();
  return pages.flatMap((page) => page.items).filter((post) => {
    if (seen.has(post.postId)) return false;
    seen.add(post.postId);
    return true;
  });
}
