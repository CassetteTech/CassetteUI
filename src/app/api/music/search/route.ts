import { NextRequest, NextResponse } from 'next/server';
import { musicSearchService } from '@/services/music-apis/music-search';
import { validateServerConfig } from '@/lib/config-server';

export async function GET(request: NextRequest) {
  try {
    // Validate server configuration on API startup
    if (!validateServerConfig()) {
      return NextResponse.json(
        { error: 'Server configuration error. Check environment variables.' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const results = await musicSearchService.searchMusic(query);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Music search error:', error);
    return NextResponse.json(
      { error: 'Failed to search music' },
      { status: 500 }
    );
  }
}