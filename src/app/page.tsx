import Link from 'next/link';
import HomePageClient from '@/components/pages/home-page-client';

export default function HomePage() {
  return (
    <>
      <HomePageClient />
      <footer className="border-t border-border/40 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
        </div>
      </footer>
    </>
  );
}
