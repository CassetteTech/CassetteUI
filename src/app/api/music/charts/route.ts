import { NextResponse } from 'next/server';
import { musicSearchService } from '@/services/music-apis/music-search';
import { validateServerConfig } from '@/lib/config-server';

export async function GET() {
  try {
    // Validate server configuration on API startup
    if (!validateServerConfig()) {
      return NextResponse.json(
        { error: 'Server configuration error. Check environment variables.' },
        { status: 500 }
      );
    }

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