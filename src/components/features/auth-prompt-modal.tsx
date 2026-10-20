'use client';

import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { InAppBrowserSignIn } from '@/components/features/auth/in-app-browser-sign-in';
import { useInAppBrowser } from '@/hooks/use-in-app-browser';
import { Button } from '@/components/ui/button';
import { Music2 } from 'lucide-react';
import { buildAuthPath } from '@/utils/auth-redirect';

interface AuthPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: string;
  title?: string;
  description?: string;
  onBeforeNavigate?: () => void;
  /** The local page that sign-in or sign-up returns to. */
  returnPath?: string;
}

export function AuthPromptModal({
  open,
  onOpenChange,
  platform,
  title,
  description,
  onBeforeNavigate,
  returnPath,
}: AuthPromptModalProps) {
  const router = useRouter();
  const inAppBrowser = useInAppBrowser();

  const handleSignUp = () => {
    onBeforeNavigate?.();
    onOpenChange(false);
    router.push(buildAuthPath('/auth/signup', returnPath));
  };

  const handleSignIn = () => {
    onBeforeNavigate?.();
    onOpenChange(false);
    router.push(buildAuthPath('/auth/signin', returnPath));
  };

  const platformName = platform
    ? platform === 'appleMusic'
      ? 'Apple Music'
      : platform.charAt(0).toUpperCase() + platform.slice(1)
    : 'your streaming service';

  const promptTitle = title || 'Create an account to continue';
  const promptDescription =
    description ||
    `Sign up for Cassette to create this playlist on ${platformName}. You'll be able to save and share playlists across all your favorite streaming platforms.`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Music2 className="h-6 w-6 text-foreground" />
          </div>
          <SheetTitle className="text-center text-xl font-bold text-foreground">
            {promptTitle}
          </SheetTitle>
          <SheetDescription className="text-center text-muted-foreground">
            {promptDescription}
          </SheetDescription>
        </SheetHeader>

        {inAppBrowser ? (
          <InAppBrowserSignIn browser={inAppBrowser} className="mt-auto p-4" />
        ) : (
          <SheetFooter className="flex flex-col gap-3 sm:flex-col">
            <Button
              onClick={handleSignUp}
              data-testid="auth-prompt-signup"
              className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Sign Up
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignIn}
              data-testid="auth-prompt-signin"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Already have an account? Sign in
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
