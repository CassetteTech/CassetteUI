import { cache } from 'react';
import type { PublicPostPageMetadata } from '../../types';
import { appLogger } from '../observability/logger';
import { getApiUrl } from '../utils/url';

const inFlightPostMetadataRequests = new Map<string, Promise<PublicPostPageMetadata | null>>();

/**
 * Server-side fetch utility for post data.
 * Used by generateMetadata and the page component. `cache()` dedupes within a
 * render, while the in-flight map also coalesces concurrent SSR requests for
 * the same post until the shared Bridge request settles.
 */
async function requestPostForMetadata(postId: string): Promise<PublicPostPageMetadata | null> {
  const apiUrl = getApiUrl();

  try {
    const response = await fetch(
      `${apiUrl}/api/v1/social/posts/${encodeURIComponent(postId)}/page-metadata`,
      {
        cache: 'no-store',
        // Metadata is best-effort: never let a slow Bridge lookup block page delivery.
        signal: AbortSignal.timeout(2000),
      },
    );

    if (!response.ok) {
      appLogger.warn('metadata_post_fetch_failed', { post_id: postId, http_status: response.status });
      return null;
    }

    const data: PublicPostPageMetadata = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      appLogger.debug('metadata_post_fetch_cancelled', { post_id: postId });
      return null;
    }
    appLogger.warn('metadata_post_fetch_failed', { error, post_id: postId });
    return null;
  }
}

export const fetchPostForMetadata = cache(function fetchPostForMetadata(
  postId: string,
): Promise<PublicPostPageMetadata | null> {
  const inFlightRequest = inFlightPostMetadataRequests.get(postId);
  if (inFlightRequest) return inFlightRequest;

  const request = requestPostForMetadata(postId);
  inFlightPostMetadataRequests.set(postId, request);

  const removeRequest = () => {
    if (inFlightPostMetadataRequests.get(postId) === request) {
      inFlightPostMetadataRequests.delete(postId);
    }
  };
  void request.then(removeRequest, removeRequest);

  return request;
});
