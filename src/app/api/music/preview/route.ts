import { NextRequest, NextResponse } from 'next/server';
import { spotifyService } from '@/services/music-apis/spotify';
import { appleMusicService } from '@/services/music-apis/apple-music';

export const dynamic = 'force-dynamic';

/**
 * GET /api/music/preview
 *
 * Fetches a preview URL for a track using the appropriate music service.
 * Uses the source platform to determine which service to use.
 *
 * Query params:
 * - sourcePlatform: The original platform ('applemusic', 'spotify', 'deezer')
 * - appleMusicTrackId: Apple Music track ID (used when sourcePlatform is applemusic)
 * - spotifyTrackId: Spotify track ID (used when sourcePlatform is spotify)
 * - isrc: The ISRC code of the track (fallback search)
 * - title: Track title (fallback search)
 * - artist: Artist name (used with title for better matching)
 */
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

    console.log('🎵 Preview URL request:', { sourcePlatform, appleMusicTrackId, spotifyTrackId, isrc, title, artist });

    let previewUrl: string | null = null;

    // Use the appropriate service based on source platform
    if (sourcePlatform === 'applemusic' && appleMusicTrackId) {
      // Apple Music playlist - use Apple Music service
      console.log('🍎 Using Apple Music service for preview (source platform: applemusic)');
      previewUrl = await appleMusicService.getPreviewByTrackId(appleMusicTrackId);
    } else if (spotifyTrackId) {
      // Spotify playlist or fallback - try Spotify direct fetch
      console.log('🎧 Using Spotify service for preview');
      previewUrl = await spotifyService.getPreviewByTrackId(spotifyTrackId);
    }

    // Fall back to Spotify ISRC/title search if direct fetch didn't work
    if (!previewUrl && (isrc || title)) {
      console.log('🔍 Falling back to Spotify search');
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
    console.error('❌ Error fetching preview URL:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preview URL' },
      { status: 500 }
    );
  }
}
