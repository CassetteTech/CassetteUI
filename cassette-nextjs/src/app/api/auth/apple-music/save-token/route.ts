import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Music user token is required' },
        { status: 400 }
      );
    }

    // Forward the Authorization header from the client
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Forward to your backend API to handle token storage
    const response = await fetch(`${config.api.url}/api/v1/music-services/apple-music/user-token`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ MusicUserToken: token }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to save Apple Music connection' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Apple Music token save error:', error);
    return NextResponse.json(
      { error: 'Failed to save Apple Music token' },
      { status: 500 }
    );
  }
}