import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HomeConceptSignal } from '@/components/home-concepts/concept-01-signal';

export const metadata: Metadata = { title: 'Home concept 1: Signal' };

export default function HomeConceptSignalPage() {
  // Suspense boundary required for useSearchParams (/1?url= auto-convert)
  return (
    <Suspense fallback={null}>
      <HomeConceptSignal />
    </Suspense>
  );
}
