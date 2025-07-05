import { NextResponse } from 'next/server';
import { musicSearchService } from '@/services/music-apis/music-search';

export async function GET() {
  try {
    const results = await musicSearchService.fetchTopCharts();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Fetch charts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top charts' },
      { status: 500 }
    );
  }
}