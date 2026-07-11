import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import HomePageClient from '@/components/pages/home-page-client';
import { SocialLinks } from '@/components/ui/social-links';

const title = 'Universal Music Links — Cassette Music';
const description = 'Turn Spotify, Apple Music, and Deezer links into one shareable MusicLink.';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  openGraph: { title, description },
  twitter: { title, description },
};

export default function HomePage() {
  return (
    <>
      {/* Suspense boundary required for useSearchParams (/?url= auto-convert) */}
      <Suspense fallback={null}>
        <HomePageClient />
      </Suspense>
      <footer className="border-t border-border/40 px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="https://www.cassette.tech/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="https://www.cassette.tech/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <SocialLinks iconClassName="h-4 w-4" />
        </div>
      </footer>
    </>
  );
}
