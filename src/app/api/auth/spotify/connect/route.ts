import { NextRequest, NextResponse } from 'next/server';
import { clientConfig } from '@/lib/config-client';
import { getCallbackUrl } from '@/lib/utils/url';
import { appLogger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${clientConfig.api.url}/api/v1/music-services/spotify/init`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        returnUrl: getCallbackUrl('/spotify_callback')
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.authUrl) {
      return NextResponse.json({ authUrl: data.authUrl });
    } else {
      appLogger.error('spotify_connect_auth_url_missing', { route: '/api/auth/spotify/connect' });
      return NextResponse.json({ error: 'No auth URL received from backend' }, { status: 500 });
    }
  } catch (error) {
    appLogger.error('spotify_connect_failed', { error, route: '/api/auth/spotify/connect' });
    return NextResponse.json({ error: 'Failed to connect to Spotify' }, { status: 500 });
  }
}
