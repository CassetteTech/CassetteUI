import { ElementType, type ConvertLifecycleResponse, type MusicLinkConversion } from '../types';

type DetectedContentType = 'track' | 'album' | 'artist' | 'playlist';

export function toElementType(detectedType: DetectedContentType): ElementType {
  switch (detectedType) {
    case 'album':
      return ElementType.ALBUM;
    case 'artist':
      return ElementType.ARTIST;
    case 'playlist':
      return ElementType.PLAYLIST;
    case 'track':
    default:
      return ElementType.TRACK;
  }
}

export function createLifecycleConversionPlaceholder(input: {
  originalUrl: string;
  detectedType: DetectedContentType;
  description?: string;
  postId: string;
  conversionJobId?: string;
  correlationId?: string;
}): MusicLinkConversion {
  return {
    originalUrl: input.originalUrl,
    convertedUrls: {},
    metadata: {
      type: toElementType(input.detectedType),
      title: 'Loading...',
      artist: '',
      artwork: '',
    },
    description: input.description || undefined,
    postId: input.postId,
    conversionJobId: input.conversionJobId,
    correlationId: input.correlationId,
  };
}

export function getLifecycleConversionFailureMessage(response: ConvertLifecycleResponse): string {
  return response.message || response.errorCode || 'Failed to convert music link';
}
