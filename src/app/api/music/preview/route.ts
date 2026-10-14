import { NextRequest, NextResponse } from 'next/server';
import { spotifyService } from '@/services/music-apis/spotify';
import { appleMusicService } from '@/services/music-apis/apple-music';
import { appLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sourcePlatform = searchParams.get('sourcePlatform')?.toLowerCase();
    const appleMusicTrackId = searchParams.get('appleMusicTrackId');
    const spotifyTrackId = searchParams.get('spotifyTrackId');
    const isrc = searchParams.get('isrc');
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');

    if (!appleMusicTrackId && !spotifyTrackId && !isrc && !title) {
      return NextResponse.json(
        { error: 'Either appleMusicTrackId, spotifyTrackId, isrc, or title parameter is required' },
        { status: 400 }
      );
    }

    let previewUrl: string | null = null;

    if (sourcePlatform === 'applemusic' && appleMusicTrackId) {
      appLogger.debug('music_preview_direct_fetch', { route: '/api/music/preview', source_platform: 'applemusic' });
      previewUrl = await appleMusicService.getPreviewByTrackId(appleMusicTrackId);
    } else if (spotifyTrackId) {
      appLogger.debug('music_preview_direct_fetch', { route: '/api/music/preview', source_platform: 'spotify' });
      previewUrl = await spotifyService.getPreviewByTrackId(spotifyTrackId);
    }

    if (!previewUrl && (isrc || title)) {
      appLogger.debug('music_preview_fallback_search', { route: '/api/music/preview', source_platform: sourcePlatform });
      previewUrl = await spotifyService.getPreviewUrl({
        isrc: isrc || undefined,
        title: title || undefined,
        artist: artist || undefined,
      });
    }

    if (!previewUrl) {
      return NextResponse.json(
        { previewUrl: null, message: 'No preview available for this track' },
        { status: 200 }
      );
    }

    return NextResponse.json({ previewUrl });
  } catch (error) {
    appLogger.error('music_preview_fetch_failed', { error, route: '/api/music/preview' });
    return NextResponse.json(
      { error: 'Failed to fetch preview URL' },
      { status: 500 }
    );
  }
}
