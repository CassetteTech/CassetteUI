'use client';

import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Spinner } from '@/components/ui/spinner';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';

export function AccountCheckStatus() {
  return (
    <output className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner size="sm" aria-hidden />
      Checking your account…
    </output>
  );
}

export function AccountCheckError({
  onRetry = () => void authService.refreshSession(),
}: {
  onRetry?: () => void;
}) {
  const isRefreshingSession = useAuthStore((state) => state.isRefreshingSession);

  return (
    <Empty>
      <EmptyTitle>Could not check your account</EmptyTitle>
      <EmptyDescription>Check your connection, then try again.</EmptyDescription>
      <Button variant="outline" onClick={onRetry} disabled={isRefreshingSession}>
        {isRefreshingSession && <Spinner size="sm" aria-hidden />}
        Try again
      </Button>
    </Empty>
  );
}
