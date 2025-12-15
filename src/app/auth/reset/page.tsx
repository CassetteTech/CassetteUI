'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { useUpdatePassword } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthInput } from '@/components/ui/auth-input';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const { mutate: updatePassword, isPending, isSuccess, error } = useUpdatePassword();

  useEffect(() => {
    let cancelled = false;

    const ensureSession = async () => {
      setIsVerifying(true);
      setSessionError(null);

      try {
        const hash = window.location.hash;

        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token') || params.get('token');
          const refreshToken = params.get('refresh_token') || params.get('refreshToken');

          if (!accessToken || !refreshToken) {
            if (!cancelled) {
              setSessionError('This reset link is invalid or has expired. Please request a new link.');
            }
            return;
          }

          try {
            await authService.handleOAuthCallback(accessToken, refreshToken);
            if (!cancelled) {
              setSessionReady(true);
              setSessionError(null);
            }
            history.replaceState({}, '', window.location.pathname);
            return;
          } catch (callbackError) {
            console.error('Failed to store tokens from reset callback', callbackError);
            if (!cancelled) {
              setSessionError('We could not verify your reset link. Please request a new email.');
            }
            return;
          }
        }

        const storedAccessToken = localStorage.getItem('access_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');

        if (storedAccessToken && storedRefreshToken) {
          if (!cancelled) {
            setSessionReady(true);
            setSessionError(null);
          }
        } else if (!cancelled) {
          setSessionError('We could not find an active reset session. Use the link from your email to continue.');
        }
      } finally {
        if (!cancelled) {
          setIsVerifying(false);
        }
      }
    };

    ensureSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!sessionReady) {
      setClientError('We need to verify your reset link before updating the password.');
      return;
    }

    if (password.length < 8) {
      setClientError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setClientError('Passwords do not match.');
      return;
    }

    setClientError(null);
    updatePassword(password, {
      onSuccess: () => {
        router.replace('/profile');
      },
    });
  };

  const mutationError = error instanceof Error ? error.message : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Choose a new password</CardTitle>
            <CardDescription>Enter a strong password you haven&apos;t used before on Cassette.</CardDescription>
          </CardHeader>
          <CardContent>
            {(isVerifying || (!sessionReady && !sessionError)) && (
              <div className="text-sm text-muted-foreground mb-6">
                Verifying your reset link…
              </div>
            )}

            {sessionError && !sessionReady && (
              <div className="mb-6 space-y-2 text-sm text-destructive">
                <p>{sessionError}</p>
                <p className="text-muted-foreground">
                  Need a new email?{' '}
                  <Link href="/auth/forgot-password" className="underline underline-offset-4">
                    Request another reset link
                  </Link>
                  .
                </p>
              </div>
            )}

            {sessionReady && !isSuccess && (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    New password
                  </label>
                  <AuthInput
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    Confirm password
                  </label>
                  <AuthInput
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>

                {(clientError || mutationError) && (
                  <p className="text-sm text-destructive">
                    {clientError || mutationError}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isPending || !sessionReady}>
                  {isPending ? 'Updating password…' : 'Update password'}
                </Button>
              </form>
            )}

            {isSuccess && (
              <div className="text-sm text-muted-foreground">
                Your password has been updated. Redirecting to your account…
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
