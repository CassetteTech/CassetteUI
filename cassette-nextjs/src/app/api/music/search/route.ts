import { NextRequest, NextResponse } from 'next/server';
import { musicSearchService } from '@/services/music-apis/music-search';

export async function GET(request: NextRequest) {
  try {
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