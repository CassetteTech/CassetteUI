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
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { useSignUp, useSignInWithProvider } from '@/hooks/use-auth';
import { SignUpForm } from '@/types';
import Image from 'next/image';

const signUpSchema = z.object({
  email: z.string().email('Please Enter A Valid Email'),
  username: z
    .string()
    .min(1, 'Please Enter Username'),
  password: z
    .string()
    .min(8, 'Please Enter At-Least 8 Digit Password'),
  confirmPassword: z.string().min(1, 'Please Enter Confirm Password'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Please agree to all the terms and conditions before signing up',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password And Confirm Password Must Be Same",
  path: ['confirmPassword'],
});

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { mutate: signUp, isPending: isSigningUp, error: signUpError, isSuccess, data: signUpResult } = useSignUp();
  const { mutate: signInWithProvider, isPending: isSigningInWithProvider } = useSignInWithProvider();

  const form = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });

  const onSubmit = (data: SignUpForm) => {
    if (isSigningUp) return; // Prevent double submission
    console.log('📝 [Signup] Form submitted with data:', { ...data, password: '[REDACTED]', confirmPassword: '[REDACTED]' });
    signUp(data);
  };

  const handleGoogleSignIn = () => {
    signInWithProvider('google');
  };

  const handleAppleSignIn = () => {
    signInWithProvider('apple');
  };

  if (isSuccess && !signUpResult?.token) {
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

            <Card>
              <CardHeader className="text-center flex flex-col items-center gap-4">
                <MailCheck className="h-12 w-12 text-primary" aria-hidden />
                <div>
                  <CardTitle className="text-2xl">Check your email</CardTitle>
                  <CardDescription>
                    We&apos;ve sent a confirmation link to your inbox. Please verify your email to complete your registration.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Button 
                  variant="outline" 
                  className="w-full" 
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

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>
                Join Cassette to share your favorite music with the world
              </CardDescription>
            </CardHeader>
            <CardContent>

            {/* Social Sign In */}
            <div className="flex flex-col gap-4 mb-6">
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isSigningInWithProvider}
                className="w-full border-borderLight bg-white hover:bg-brandCreamL text-foreground shadow-sm hover:shadow transition-all dark:bg-black/40 dark:hover:bg-black/60 dark:border-white/20"
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
                className="w-full border-borderLight bg-white hover:bg-brandCreamL text-foreground shadow-sm hover:shadow transition-all dark:bg-black/40 dark:hover:bg-black/60 dark:border-white/20"
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
                  Or create account with email
                </span>
              </div>
            </div>

            {/* Email Sign Up Form */}
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
                  {isSigningUp ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            </Form>

              <div className="text-center text-sm mt-4">
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  className="underline underline-offset-4"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <div className="text-muted-foreground text-center text-xs text-balance">
            By creating an account, you agree to our{' '}
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
