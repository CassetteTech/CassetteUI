import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

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

    // Get developer token from your backend API
    const response = await fetch(`${config.api.url}/api/v1/music-services/apple-music/developer-token`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.developerToken) {
      return NextResponse.json({ developerToken: data.developerToken });
    } else {
      console.error('No developer token received from backend');
      return NextResponse.json(
        { error: 'Failed to get developer token from backend' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Apple Music developer token error:', error);
    return NextResponse.json(
      { error: 'Failed to generate developer token' },
      { status: 500 }
    );
  }
}