'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { ArtworkWallBackground } from '@/components/features/marketing/artwork-wall-background';
import { useSignInWithProvider } from '@/hooks/use-auth';
import Image from 'next/image';
import { GoogleGIcon } from '@/components/ui/google-g-icon';
import { PendingLabel } from '@/components/ui/interior/loading-button';
import { authRedirectService } from '@/utils/auth-redirect';
import { pendingActionService } from '@/utils/pending-action';
import { useAuthIntent } from '@/hooks/use-auth-intent';
import { MembershipPurchaseSummary } from '@/components/features/auth/membership-purchase-summary';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const {
    mutate: signInWithProvider,
    isPending: isSigningInWithProvider,
    error: providerSignInError,
  } = useSignInWithProvider();
  const redirect = searchParams.get('redirect');
  const oauthError = searchParams.get('error');
  const signUpHref = redirect
    ? `/auth/signup?redirect=${encodeURIComponent(redirect)}`
    : '/auth/signup';
  const authErrorMessage = providerSignInError
    ? 'We could not start Google sign-in. Please try again.'
    : oauthError === 'oauth-error'
      ? 'Google sign-in was canceled or could not be completed. Please try again.'
      : oauthError
        ? 'We could not complete Google sign-in. Please try again.'
        : null;

  const { isPromoteIntent, membershipIntent, purchaseContext } = useAuthIntent(redirect, '/auth/signin');

  useEffect(() => {
    if (oauthError) {
      pendingActionService.clear();
    }
  }, [oauthError]);

  const handleGoogleSignIn = () => {
    authRedirectService.save(redirect);
    signInWithProvider('google');
  };

  return (
    <div className="min-h-svh bg-background relative overflow-hidden">
      <ArtworkWallBackground />

      <div className="relative z-10 flex items-center justify-center min-h-svh px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex flex-col items-center">
              <Image
                src="/images/cassette_words_logo.png"
                alt="Cassette"
                width={200}
                height={80}
                className="mb-2"
                priority
              />
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
                <Image
                  src="/images/cassette_logo.svg"
                  alt=""
                  width={14}
                  height={14}
                  aria-hidden
                />
                Sign In
              </p>
              <h1 className="text-2xl font-semibold tracking-tight leading-none">
                {membershipIntent ? 'Sign in to continue' : 'Welcome back!'}
              </h1>
              <CardDescription className="font-roboto italic mt-2">
                {membershipIntent
                  ? 'Sign in and you will go straight to secure payment.'
                  : isPromoteIntent
                    ? 'Sign in to manage your campaign, payment, and receipts.'
                    : 'Pick up where you left off.'}
              </CardDescription>
            </CardHeader>
            <CardContent>

            {membershipIntent && (
              <MembershipPurchaseSummary
                intent={membershipIntent}
                context={purchaseContext}
                nextStep="Next step: payment on the curator's page. New to Cassette? Creating an account is free."
              />
            )}
            {authErrorMessage && (
              <p
                role="alert"
                data-testid="auth-error-message"
                className="mb-4 text-sm text-destructive"
              >
                {authErrorMessage}
              </p>
            )}

            {/* Google Sign In */}
            <div className="flex flex-col gap-4 mb-6">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSigningInWithProvider}
                aria-busy={isSigningInWithProvider}
                className="w-full h-11 rounded-none border-2 border-foreground bg-[hsl(var(--cassette-white))] dark:bg-background text-foreground font-bold text-sm shadow-flat-3 hover:-translate-y-0.5 hover:shadow-flat-5 transition-[transform,box-shadow]"
              >
                <PendingLabel
                  pending={isSigningInWithProvider}
                  label={
                    <>
                      <GoogleGIcon className="mr-2 h-4 w-4" />
                      Continue with Google
                    </>
                  }
                  pendingLabel="Connecting to Google…"
                />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Google is currently the only sign-in option. No password to remember.
              </p>
            </div>

              <div className="text-center text-sm mt-4 font-roboto text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href={signUpHref}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors"
                >
                  Sign Up →
                </Link>
              </div>
              <div className="text-muted-foreground text-center text-xs text-balance mt-4">
                By clicking continue, you agree to our{' '}
                <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                  Privacy Policy
                </Link>
                .
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
