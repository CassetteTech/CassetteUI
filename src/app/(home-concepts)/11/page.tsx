import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HomeConceptWindow } from '@/components/home-concepts/concept-11-window';

export const metadata: Metadata = { title: 'Home concept 11: Window' };

export default function HomeConceptWindowPage() {
  // Suspense boundary required for useSearchParams (/11?url= auto-convert)
  return (
    <Suspense fallback={null}>
      <HomeConceptWindow />
    </Suspense>
  );
}
