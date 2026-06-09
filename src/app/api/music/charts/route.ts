import { NextResponse } from 'next/server';
import { musicSearchService } from '@/services/music-apis/music-search';
import { validateServerConfig } from '@/lib/config-server';
import { appLogger } from '@/lib/observability/logger';

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
    appLogger.error('music_charts_route_failed', { error, route: '/api/music/charts' });
    return NextResponse.json(
      { error: 'Failed to fetch top charts' },
      { status: 500 }
    );
  }
}
