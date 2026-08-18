/** Resolves a minimal anonymous curator lookup shared by route metadata and 404 handling. */

import { cache } from 'react';
import { CuratorPageError, fetchCuratorPage, type CuratorPage } from '@/services/curator';
import { getApiUrl } from '@/lib/utils/url';
import { appLogger } from '@/lib/observability/logger';

export type CuratorPageLookup =
  | { status: 'found'; page: CuratorPage }
  | { status: 'not_found' }
  | { status: 'unavailable' };

export const fetchCuratorPageForMetadata = cache(async function fetchCuratorPageForMetadata(
  username: string,
): Promise<CuratorPageLookup> {
  try {
    const page = await fetchCuratorPage(
      username,
      1,
      1,
      getApiUrl(),
      AbortSignal.timeout(2000),
    );
    return { status: 'found', page };
  } catch (error) {
    if (error instanceof CuratorPageError && error.status === 404) {
      return { status: 'not_found' };
    }

    appLogger.warn('metadata_curator_fetch_failed', { error });
    return { status: 'unavailable' };
  }
});
