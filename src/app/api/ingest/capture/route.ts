import { NextResponse } from 'next/server';

const DEFAULT_POSTHOG_HOST = 'https://app.posthog.com';

export const dynamic = 'force-dynamic';

function getPosthogIngestHost(): string {
  return process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
}

export async function POST(request: Request) {
  const isDev = process.env.NODE_ENV !== 'production';
  const body = await request.text();
  if (!body) {
    return NextResponse.json({ error: 'Missing capture payload' }, { status: 400 });
  }

  const endpoint = `${getPosthogIngestHost().replace(/\/$/, '')}/capture/`;

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
    });

    if (!upstream.ok) {
      if (isDev) {
        console.warn('PostHog ingest proxy rejected capture', {
          status: upstream.status,
          endpoint,
          payloadBytes: body.length,
        });
      }
      return NextResponse.json({ error: 'Upstream capture rejected' }, { status: upstream.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    if (isDev) {
      console.warn('PostHog ingest proxy failed to forward capture', {
        endpoint,
        payloadBytes: body.length,
      });
    }
    return NextResponse.json({ error: 'Failed to forward capture payload' }, { status: 502 });
  }
}
