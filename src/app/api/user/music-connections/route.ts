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

    // Get music connections from your backend API
    const response = await fetch(`${config.api.url}/api/v1/music-services/connected`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the backend's services array to match frontend expectations
    const connections = (data.services || []).map((service: string) => ({
      id: service,
      service: service,
      connectedAt: new Date().toISOString(),
      isConnected: true
    }));
    
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Failed to fetch user music connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch music connections' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');

    if (!service) {
      return NextResponse.json(
        { error: 'Service parameter is required' },
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

    // Disconnect service via your backend API
    const response = await fetch(`${config.api.url}/api/v1/music-services/${service}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to disconnect music service' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to disconnect music service:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect music service' },
      { status: 500 }
    );
  }
}