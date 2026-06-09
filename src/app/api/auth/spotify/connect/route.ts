import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getCallbackUrl } from '@/lib/utils/url';
import { appLogger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    // Forward the Authorization header from the client
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Call your backend API directly from the server-side route
    const response = await fetch(`${config.api.url}/api/v1/music-services/spotify/init`, {
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
      // Return the auth URL as JSON so the frontend can redirect
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
