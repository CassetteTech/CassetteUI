import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HomeConceptSplitDesk } from '@/components/home-concepts/concept-02-split-desk';

export const metadata: Metadata = { title: 'Home concept 2: SplitDesk' };

export default function HomeConceptSplitDeskPage() {
  // Suspense boundary required for useSearchParams (/2?url= auto-convert)
  return (
    <Suspense fallback={null}>
      <HomeConceptSplitDesk />
    </Suspense>
  );
}
