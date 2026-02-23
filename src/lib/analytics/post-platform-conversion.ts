import type { AnalyticsBaseProps, ElementTypeDimension, PlatformDimension } from './events';
import { normalizePlatform, sanitizeDomain } from './sanitize';

export const POST_PLATFORM_CONVERSION_CONTEXTS = [
  'destination_open_button',
  'playlist_convert_button',
  'playlist_open_button',
] as const;

export type PostPlatformConversionContext = typeof POST_PLATFORM_CONVERSION_CONTEXTS[number];

type BuildPostPlatformConversionPropsInput = {
  sourceContext: string;
  route?: string;
  postId?: string;
  elementType?: ElementTypeDimension;
  targetPlatform?: string;
  sourcePlatform?: string;
  sourceDomain?: string;
  isAuthenticated?: boolean;
};

export function isPostPlatformConversionContext(value: string): value is PostPlatformConversionContext {
  return POST_PLATFORM_CONVERSION_CONTEXTS.includes(value as PostPlatformConversionContext);
}

function normalizePlatformDimension(value: string | undefined): PlatformDimension {
  return normalizePlatform(value) ?? 'unknown';
}

export function buildPostPlatformConversionClickedProps(
  input: BuildPostPlatformConversionPropsInput,
): AnalyticsBaseProps | null {
  if (!isPostPlatformConversionContext(input.sourceContext)) {
    return null;
  }

  return {
    route: input.route,
    source_surface: 'post',
    post_id: input.postId,
    element_type: input.elementType,
    target_platform: normalizePlatformDimension(input.targetPlatform),
    source_platform: normalizePlatformDimension(input.sourcePlatform),
    source_domain: sanitizeDomain(input.sourceDomain),
    is_authenticated: input.isAuthenticated,
    source_context: input.sourceContext,
  };
}
