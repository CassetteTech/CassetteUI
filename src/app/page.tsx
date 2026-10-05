import { Suspense } from 'react';
import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { HomeConceptWindow } from '@/components/home-concepts/concept-11-window';
import { homeWordmarkLayerImage } from '@/components/pages/home-wordmark';
import { DEFAULT_SOCIAL_PREVIEW } from '@/lib/seo';

const title = 'Cassette: get paid for your playlists';
const description = 'Make a free page where fans pay a monthly price to join. Share songs and playlists that open in Spotify, Apple Music, or Deezer.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: '/' },
  openGraph: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
  twitter: { ...DEFAULT_SOCIAL_PREVIEW, title, description },
};

export default function HomePage() {
  // The home page renders on the client, so fetch the wordmark layer with the
  // HTML; otherwise it would only start loading when the wordmark animates.
  preload(homeWordmarkLayerImage, { as: 'image', fetchPriority: 'high' });

  return (
    // Suspense boundary required for useSearchParams (/?url= auto-convert)
    <Suspense fallback={null}>
      <HomeConceptWindow />
    </Suspense>
  );
}
