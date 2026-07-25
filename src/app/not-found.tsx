import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MainContainer } from '@/components/ui/container';
import { HeadlineText, BodyText } from '@/components/ui/typography';

export const metadata: Metadata = {
  title: { absolute: 'Page Not Found — Cassette Music' },
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center">
      <MainContainer className="p-8 text-center">
        <HeadlineText className="mb-2">Page not found</HeadlineText>
        <BodyText className="mb-6 text-text-secondary">
          That page does not exist. It may have moved, or the link may be incomplete.
        </BodyText>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="h-10">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline" className="h-10">
            <Link href="/explore">Explore music</Link>
          </Button>
        </div>
      </MainContainer>
    </div>
  );
}
