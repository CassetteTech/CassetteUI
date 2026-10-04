const LAST_VIEWED_SPONSORED_POST_KEY = 'cassette:last-viewed-sponsored-explore-post:v1';
const MAX_POST_ID_LENGTH = 128;

function normalizePostId(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > MAX_POST_ID_LENGTH || !normalized.startsWith('p_')) {
    return undefined;
  }

  return normalized;
}

export function getLastViewedSponsoredExplorePostId(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return normalizePostId(window.localStorage.getItem(LAST_VIEWED_SPONSORED_POST_KEY));
  } catch {
    return undefined;
  }
}

export function rememberViewedSponsoredExplorePost(postId: string): void {
  if (typeof window === 'undefined') return;

  const normalized = normalizePostId(postId);
  if (!normalized) return;

  try {
    window.localStorage.setItem(LAST_VIEWED_SPONSORED_POST_KEY, normalized);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}
