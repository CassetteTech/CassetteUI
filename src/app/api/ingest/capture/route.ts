import { NextResponse } from 'next/server';
import { appLogger } from '@/lib/observability/logger';
import {
  buildUpstreamCaptureHeaders,
  enrichCapturePayload,
  resolveIngestClientContext,
} from '@/lib/server/posthog-ingest-forwarding';

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
  const clientContext = resolveIngestClientContext(request.headers);

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: buildUpstreamCaptureHeaders(clientContext),
      body: enrichCapturePayload(body, clientContext),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      if (isDev) {
        appLogger.warn('posthog_ingest_proxy_rejected_capture', {
          http_status: upstream.status,
          payload_bytes: body.length,
          route: '/api/ingest/capture',
        });
      }
      return NextResponse.json({ error: 'Upstream capture rejected' }, { status: upstream.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    if (isDev) {
      appLogger.warn('posthog_ingest_proxy_forward_failed', {
        payload_bytes: body.length,
        route: '/api/ingest/capture',
      });
    }
    return NextResponse.json({ error: 'Failed to forward capture payload' }, { status: 502 });
  }
}
