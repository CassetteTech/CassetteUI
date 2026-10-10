'use client';

/** Session states that are neither signed in nor signed out: still checking, or the check failed. */

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

/** A failed session read. Retrying reads the session again; it never signs the viewer out. */
export function AccountCheckError({
  onRetry = () => void authService.refreshSession(),
}: {
  /** A page that must act on the answer, such as a sign-in callback, retries its own way. */
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
