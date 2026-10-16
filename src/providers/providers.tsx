'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AuthProvider } from './auth-provider';
import { ThemeProvider } from './theme-provider';
import { ReportIssueProvider } from './report-issue-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ChunkLoadRecovery } from '@/components/system/chunk-load-recovery';

const E2E_QUERY_RETRY_DELAY_MS = process.env.NEXT_PUBLIC_E2E_QUERY_RETRY_DELAY_MS;

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error: Error & { status?: number }) => {
              if (error?.status && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 3;
            },
            retryDelay: E2E_QUERY_RETRY_DELAY_MS ? Number(E2E_QUERY_RETRY_DELAY_MS) : undefined,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ChunkLoadRecovery />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={600} skipDelayDuration={300}>
            <ReportIssueProvider>
              {children}
            </ReportIssueProvider>
          </TooltipProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
