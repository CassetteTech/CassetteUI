import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HomeConceptArtworkWall } from '@/components/home-concepts/concept-06-artwork-wall';

export const metadata: Metadata = { title: 'Home concept 6: ArtworkWall' };

export default function HomeConceptArtworkWallPage() {
  // Suspense boundary required for useSearchParams (/6?url= auto-convert)
  return (
    <Suspense fallback={null}>
      <HomeConceptArtworkWall />
    </Suspense>
  );
}
