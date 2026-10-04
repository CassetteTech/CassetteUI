import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BackgroundGallery } from '@/components/home-concepts/background-gallery';

export const metadata: Metadata = { title: 'Home concept backgrounds' };

export default function BackgroundGalleryPage() {
  // Suspense boundary required for useSearchParams (the search hook)
  return (
    <Suspense fallback={null}>
      <BackgroundGallery />
    </Suspense>
  );
}
