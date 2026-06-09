'use client';

import { useEffect } from 'react';
import { captureUiException } from '@/lib/observability/error-reporting';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureUiException(error, {
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      operation: 'global_error_boundary',
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
          <div className="max-w-md text-center space-y-6">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              onClick={() => reset()}
              type="button"
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
