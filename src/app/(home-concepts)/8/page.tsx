import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HomeConceptProfileLed } from '@/components/home-concepts/concept-08-profile-led';

export const metadata: Metadata = { title: 'Home concept 8: ProfileLed' };

export default function HomeConceptProfileLedPage() {
  // Suspense boundary required for useSearchParams (/8?url= auto-convert)
  return (
    <Suspense fallback={null}>
      <HomeConceptProfileLed />
    </Suspense>
  );
}
