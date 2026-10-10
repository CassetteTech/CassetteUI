'use client';

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
import { useAuthIntent } from '@/hooks/use-auth-intent';
import { MembershipPurchaseSummary } from '@/components/features/auth/membership-purchase-summary';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const {
    mutate: signInWithProvider,
    isPending: isSigningInWithProvider,
    error: providerSignInError,
  } = useSignInWithProvider();
  const redirect = searchParams.get('redirect');
  const signInHref = redirect
    ? `/auth/signin?redirect=${encodeURIComponent(redirect)}`
    : '/auth/signin';

  const { isPromoteIntent, membershipIntent, purchaseContext } = useAuthIntent(redirect, '/auth/signup');

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
                Join Cassette
              </p>
              <h1 className="text-2xl font-semibold tracking-tight leading-none">
                {membershipIntent ? 'Create a free account' : 'Create your account'}
              </h1>
              <CardDescription className="font-roboto italic mt-2">
                {membershipIntent
                  ? 'Your account is free. Payment for the membership comes next, on the curator\u2019s page.'
                  : isPromoteIntent
                    ? 'Create your Cassette account to manage your campaign, payment, and receipts.'
                    : 'Share your favorite music with the world.'}
              </CardDescription>
            </CardHeader>
            <CardContent>

            {membershipIntent && (
              <MembershipPurchaseSummary
                intent={membershipIntent}
                context={purchaseContext}
                nextStep="Next step: pick a username, then pay securely on the curator's page."
              />
            )}
            {providerSignInError && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                We could not start Google sign-in. Please try again.
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
                Google is currently the only sign-up option. No password to remember.
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-5">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="underline hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

              <div className="text-center text-sm mt-4 font-roboto text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href={signInHref}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors"
                >
                  Sign In →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
