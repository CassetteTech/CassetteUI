'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AuthInput } from '@/components/ui/auth-input';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff } from 'lucide-react';
import { useSignIn, useSignInWithProvider } from '@/hooks/use-auth';
import { SignInForm } from '@/types';
import Image from 'next/image';

const signInSchema = z.object({
  email: z.string().email('Please Enter A Valid Email'),
  password: z.string().min(8, 'Please Enter At-Least 8 Digit Password'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Please agree to all the terms and conditions before Signing in',
  }),
});

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { mutate: signIn, isPending: isSigningIn, error: signInError } = useSignIn();
  const { mutate: signInWithProvider, isPending: isSigningInWithProvider } = useSignInWithProvider();

  const form = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      acceptTerms: false,
    },
  });

  const onSubmit = (data: SignInForm) => {
    signIn(data);
  };

  const handleGoogleSignIn = () => {
    signInWithProvider('google');
  };

  const handleAppleSignIn = () => {
    signInWithProvider('apple');
  };

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

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Welcome back!</CardTitle>
              <CardDescription>
                Enter your information below to sign in
              </CardDescription>
            </CardHeader>
            <CardContent>

            {/* Social Sign In */}
            <div className="flex flex-col gap-4 mb-6">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isSigningInWithProvider}
                className="w-full border-borderLight bg-white hover:bg-brandCreamL text-foreground shadow-sm hover:shadow transition-all"
              >
                <Image
                  src="/images/social_images/ic_auth_google.png"
                  alt="Google"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                Continue with Google
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAppleSignIn}
                disabled={isSigningInWithProvider}
                className="w-full border-borderLight bg-white hover:bg-brandCreamL text-foreground shadow-sm hover:shadow transition-all"
              >
                <Image
                  src="/images/apple_music_logo_colored.png"
                  alt="Apple"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                Continue with Apple
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email Sign In Form */}
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="/auth/forgot-password"
                          className="ml-auto text-sm underline-offset-4 hover:underline"
                        >
                          Forgot your password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <AuthInput
                            placeholder="Enter your password"
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
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          I have read and agreed to the{' '}
                          <Link href="/terms" className="underline hover:underline">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link href="/privacy" className="underline hover:underline">
                            Privacy Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                {signInError && (
                  <div className="text-sm text-destructive">
                    {signInError.message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSigningIn}
                  className="w-full"
                >
                  {isSigningIn ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </Form>

              <div className="text-center text-sm mt-4">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="underline underline-offset-4"
                >
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-muted-foreground text-center text-xs text-balance">
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
        </div>
      </div>
    </div>
  );
}