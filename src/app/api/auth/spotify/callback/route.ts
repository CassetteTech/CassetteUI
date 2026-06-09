import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { appLogger } from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for authorization errors
    if (error) {
      appLogger.warn('spotify_callback_route_authorization_denied', {
        error_code: error,
        route: '/api/auth/spotify/callback',
      });
      return NextResponse.json({ error: 'spotify-auth-denied' }, { status: 400 });
    }

    if (!code || !state) {
      appLogger.error('spotify_callback_route_invalid_request', { route: '/api/auth/spotify/callback' });
      return NextResponse.json({ error: 'spotify-invalid-callback' }, { status: 400 });
    }

    // Forward the Authorization header from the client
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Forward to your backend API to handle the token exchange and storage
    const response = await fetch(`${config.api.url}/api/v1/music-services/spotify/exchange-code`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ Code: code, State: state }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ 
        success: true, 
        user: data.user 
      });
    } else {
      return NextResponse.json({ error: 'spotify-callback-failed' }, { status: 400 });
    }
  } catch (error) {
    appLogger.error('spotify_callback_route_failed', { error, route: '/api/auth/spotify/callback' });
    return NextResponse.json({ error: 'spotify-callback-failed' }, { status: 500 });
  }
}
