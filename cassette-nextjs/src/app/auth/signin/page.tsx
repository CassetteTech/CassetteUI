'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AnimatedButton } from '@/components/ui/animated-button';
import { MainContainer } from '@/components/ui/container';
import { AuthField } from '@/components/ui/text-field';
import { 
  AddMusicTitle, 
  BodyText, 
  UIText 
} from '@/components/ui/typography';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff } from 'lucide-react';
import { useSignIn, useSignInWithProvider } from '@/hooks/use-auth';
import { SignInForm } from '@/types';
import Image from 'next/image';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
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
    <div className="min-h-screen bg-cream relative overflow-hidden">
      {/* Animated Background */}
      <AnimatedBackground className="fixed inset-0 z-0" />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex flex-col items-center">
              <Image
                src="/images/app_logo_text.png"
                alt="Cassette"
                width={200}
                height={80}
                className="mb-2"
                priority
              />
            </Link>
          </div>

          <MainContainer className="p-8">
            <div className="text-center mb-8">
              <AddMusicTitle className="mb-4">Welcome back!</AddMusicTitle>
              <BodyText className="text-text-secondary">
                Enter your information below to sign in
              </BodyText>
            </div>

            {/* Social Sign In */}
            <div className="space-y-4 mb-6">
              <AnimatedButton
                onClick={handleGoogleSignIn}
                disabled={isSigningInWithProvider}
                height={48}
                width={400}
                initialPos={4}
                className="w-full flex items-center justify-center"
              >
                <div className="flex items-center">
                  <Image
                    src="/images/social_images/ic_auth_google.png"
                    alt="Google"
                    width={20}
                    height={20}
                    className="mr-3"
                  />
                  <UIText className="text-white">Continue with Google</UIText>
                </div>
              </AnimatedButton>
              
              <AnimatedButton
                onClick={handleAppleSignIn}
                disabled={isSigningInWithProvider}
                height={48}
                width={400}
                initialPos={4}
                className="w-full flex items-center justify-center"
              >
                <div className="flex items-center">
                  <Image
                    src="/images/social_images/ic_apple.png"
                    alt="Apple"
                    width={20}
                    height={20}
                    className="mr-3"
                  />
                  <UIText className="text-white">Continue with Apple</UIText>
                </div>
              </AnimatedButton>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="border-text-hint" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-text-secondary font-atkinson font-bold">
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
                      <FormLabel className="font-atkinson font-bold text-text-primary">Email</FormLabel>
                      <FormControl>
                        <AuthField
                          placeholder="your@email.com"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-atkinson text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-atkinson font-bold text-text-primary">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <AuthField
                            placeholder="Enter your password"
                            type={showPassword ? 'text' : 'password'}
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-hint hover:text-text-primary transition-colors"
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
                      <FormMessage className="font-atkinson text-sm" />
                    </FormItem>
                  )}
                />

                {signInError && (
                  <div className="text-sm text-red-500 font-atkinson">
                    {signInError.message}
                  </div>
                )}

                <AnimatedButton
                  text={isSigningIn ? 'Signing in...' : 'Sign In'}
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSigningIn}
                  height={48}
                  width={400}
                  initialPos={6}
                  colorTop="#1F2327"
                  colorBottom="#595C5E"
                  borderColorTop="#1F2327"
                  borderColorBottom="#1F2327"
                  className="w-full"
                />
              </form>
            </Form>

            <div className="text-center space-y-4 mt-6">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-text-secondary hover:text-text-primary font-atkinson"
              >
                Forgot your password?
              </Link>
              <div className="text-sm text-text-secondary font-atkinson">
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:underline font-bold"
                >
                  Sign up
                </Link>
              </div>
            </div>
          </MainContainer>
        </div>
      </div>
    </div>
  );
}