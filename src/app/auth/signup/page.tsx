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
  CardTitle,
} from '@/components/ui/card';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { MailCheck } from 'lucide-react';
import { useSignUp, useSignInWithProvider } from '@/hooks/use-auth';
import Image from 'next/image';
import { GoogleGIcon } from '@/components/ui/google-g-icon';
import { authRedirectService } from '@/utils/auth-redirect';

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const { isSuccess, data: signUpResult } = useSignUp();
  const { mutate: signInWithProvider, isPending: isSigningInWithProvider } = useSignInWithProvider();
  const redirect = searchParams.get('redirect');

  useEffect(() => {
    authRedirectService.save(redirect);
  }, [redirect]);

  const handleGoogleSignIn = () => {
    authRedirectService.save(redirect);
    signInWithProvider('google');
  };

  // Keep email verification screen for users who signed up via email previously
  if (isSuccess && signUpResult?.authenticated !== true) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <AnimatedBackground className="fixed inset-0 z-0" />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
          <div className="w-full max-w-md">
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

            <Card className="bg-[hsl(var(--cassette-white))] dark:bg-[hsl(var(--secondary))] text-foreground border-2 border-foreground rounded-none shadow-[6px_6px_0_#232629] dark:shadow-none">
              <CardHeader className="text-center flex flex-col items-center gap-3">
                <div className="h-14 w-14 border-2 border-foreground bg-background flex items-center justify-center shadow-[3px_3px_0_hsl(var(--foreground))]">
                  <MailCheck className="h-7 w-7 text-primary" aria-hidden />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
                    Almost There
                  </p>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    Check your email
                  </CardTitle>
                  <CardDescription className="font-roboto italic mt-2">
                    We sent a confirmation link to your inbox. Click through to finish setting up.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Button
                  className="w-full h-11 rounded-none border-2 border-foreground bg-[hsl(var(--cassette-white))] dark:bg-background text-foreground font-bold text-sm shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_hsl(var(--foreground))] transition-all"
                  onClick={() => window.location.href = '/auth/signin'}
                >
                  Return to Sign In
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground className="fixed inset-0 z-0" />

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
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

          <Card className="bg-[hsl(var(--cassette-white))] dark:bg-[hsl(var(--secondary))] text-foreground border-2 border-foreground rounded-none shadow-[6px_6px_0_#232629] dark:shadow-none">
            <CardHeader className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
                <Image
                  src="/images/cassette_logo.png"
                  alt=""
                  width={14}
                  height={14}
                  aria-hidden
                />
                Join Cassette
              </p>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Create your account
              </CardTitle>
              <CardDescription className="font-roboto italic mt-2">
                Share your favorite music with the world.
              </CardDescription>
            </CardHeader>
            <CardContent>

            {/* Google Sign In */}
            <div className="flex flex-col gap-4 mb-6">
              <Button
                onClick={handleGoogleSignIn}
                disabled={isSigningInWithProvider}
                className="w-full h-11 rounded-none border-2 border-foreground bg-[hsl(var(--cassette-white))] dark:bg-background text-foreground font-bold text-sm shadow-[3px_3px_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_hsl(var(--foreground))] transition-all"
              >
                <GoogleGIcon className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>
            </div>

            {/* EMAIL AUTH - TEMPORARILY DISABLED
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or create account with email
                </span>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <AuthInput
                          placeholder="m@example.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <AuthInput
                          placeholder="your_username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <AuthInput
                            placeholder="Create a strong password"
                            type={showPassword ? 'text' : 'password'}
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <AuthInput
                            placeholder="Confirm your password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <p className="text-xs text-muted-foreground leading-5">
                  By clicking Sign Up, you agree to our{' '}
                  <Link href="/terms" className="underline hover:underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="underline hover:underline">
                    Privacy Policy
                  </Link>
                  . You may receive SMS Notifications from us and can opt out any time.
                </p>

                {signUpError && (
                  <div className="text-sm text-destructive">
                    {signUpError.message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSigningUp}
                  className="w-full"
                >
                  {isSigningUp ? 'Signing up...' : 'Sign Up'}
                </Button>
              </form>
            </Form>
            END EMAIL AUTH - TEMPORARILY DISABLED */}

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
                  href="/auth/signin"
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
