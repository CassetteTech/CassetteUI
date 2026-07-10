import { Suspense } from 'react';
import { MusicServiceOAuthCallback } from '@/components/features/music/music-service-oauth-callback';
import { PageLoader } from '@/components/ui/page-loader';

export default function DeezerCallbackPage() {
  return (
    <Suspense fallback={<PageLoader message="Connecting your Deezer account..." />}>
      <MusicServiceOAuthCallback platform="deezer" displayName="Deezer" />
    </Suspense>
  );
}
