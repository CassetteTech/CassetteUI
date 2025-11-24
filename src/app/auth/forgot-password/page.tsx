'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthInput } from '@/components/ui/auth-input';
import { useResetPassword } from '@/hooks/use-auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const { mutate: resetPassword, isPending, isSuccess, error } = useResetPassword();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setClientError('Enter the email associated with your account.');
      return;
    }

    setClientError(null);
    resetPassword(normalizedEmail);
  };

  const mutationError = error instanceof Error ? error.message : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Forgot your password?</CardTitle>
            <CardDescription>
              We&apos;ll send a secure password reset link to your email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Check your inbox for a password reset link.</p>
                <p>If you don&apos;t see it after a minute, check your spam folder or request another link.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email address
                  </label>
                  <AuthInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                {(clientError || mutationError) && (
                  <p className="text-sm text-destructive">
                    {clientError || mutationError}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Sending reset link…' : 'Send reset link'}
                </Button>
              </form>
            )}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it?{' '}
              <Link href="/auth/signin" className="underline underline-offset-4 hover:text-foreground">
                Return to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
