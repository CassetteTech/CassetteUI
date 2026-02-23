'use client';

import { useEffect } from 'react';
import { AnimatedButton } from '@/components/ui/animated-button';
import { HeadlineText, BodyText } from '@/components/ui/typography';
import { AnimatedBackground } from '@/components/ui/animated-background';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground className="fixed inset-0 z-0" />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="mb-6">
            <svg className="w-20 h-20 text-destructive mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <HeadlineText className="mb-4">Something went wrong!</HeadlineText>
          <BodyText className="text-muted-foreground mb-8">
            We encountered an unexpected error. Please try again.
          </BodyText>
          
          <div className="flex gap-4 justify-center">
            <AnimatedButton
              text="Try again"
              onClick={() => reset()}
              height={40}
              width={120}
              initialPos={4}
            />
            <AnimatedButton
              text="Go home"
              onClick={() => window.location.href = '/'}
              height={40}
              width={120}
              initialPos={4}
              colorTop='hsl(var(--secondary))'
              colorBottom='hsl(var(--muted-foreground))'
            />
          </div>
        </div>
      </div>
    </div>
  );
}