'use client';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { theme } from '@/lib/theme';
import { Music2 } from 'lucide-react';

interface AuthPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform?: string;
  onBeforeNavigate?: () => void;
}

export function AuthPromptModal({
  open,
  onOpenChange,
  platform,
  onBeforeNavigate,
}: AuthPromptModalProps) {
  const router = useRouter();

  const handleSignUp = () => {
    onBeforeNavigate?.();
    onOpenChange(false);
    router.push('/auth/signup');
  };

  const handleSignIn = () => {
    onBeforeNavigate?.();
    onOpenChange(false);
    router.push('/auth/signin');
  };

  const platformName = platform
    ? platform === 'appleMusic'
      ? 'Apple Music'
      : platform.charAt(0).toUpperCase() + platform.slice(1)
    : 'your streaming service';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-4 max-w-md">
        <DialogHeader className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Music2 className="h-6 w-6 text-foreground" />
          </div>
          <DialogTitle className="text-center text-xl font-bold text-foreground">
            Create an account to continue
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Sign up for Cassette to create this playlist on {platformName}.
            You&apos;ll be able to save and share playlists across all your favorite streaming platforms.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-3 sm:flex-col">
          <Button
            onClick={handleSignUp}
            className="w-full h-11 font-semibold text-white"
            style={{ backgroundColor: theme.colors.brandRed }}
          >
            Sign Up
          </Button>
          <Button
            variant="ghost"
            onClick={handleSignIn}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Already have an account? Sign in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
