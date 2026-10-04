import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HomeConceptPoster } from '@/components/home-concepts/concept-05-poster';

export const metadata: Metadata = { title: 'Home concept 5: Poster' };

export default function HomeConceptPosterPage() {
  // Suspense boundary required for useSearchParams (/5?url= auto-convert)
  return (
    <Suspense fallback={null}>
      <HomeConceptPoster />
    </Suspense>
  );
}
