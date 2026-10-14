import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendUrl,
  createProxyResponse,
  forwardApiRequest,
  requireSameOrigin,
} from '@/lib/server/auth-proxy';

type RouteContext = { params: Promise<{ curatorProfileId: string }> };

// Next decodes the segment, so an encoded slash or dot segment would otherwise
// change the Bridge path. Only a curator profile ID shape is forwarded.
const CURATOR_PROFILE_ID = /^cpr_[0-9A-Za-z]{1,36}$/;

async function forwardFollow(request: NextRequest, context: RouteContext) {
  const rejected = requireSameOrigin(request);
  if (rejected) return rejected;

  const { curatorProfileId } = await context.params;
  if (!CURATOR_PROFILE_ID.test(curatorProfileId)) {
    return NextResponse.json({ success: false, message: 'Curator not found' }, { status: 404 });
  }

  if (process.env.PLAYWRIGHT_TEST === 'true') {
    return NextResponse.json(
      { success: false, message: 'Backend is not configured for Playwright SSR proxy requests' },
      { status: 503 },
    );
  }

  const backendUrl = buildBackendUrl(`/api/v1/curators/${curatorProfileId}/follow`);
  return createProxyResponse(await forwardApiRequest(request, backendUrl));
}

export function GET(request: NextRequest, context: RouteContext) {
  return forwardFollow(request, context);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return forwardFollow(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return forwardFollow(request, context);
}
