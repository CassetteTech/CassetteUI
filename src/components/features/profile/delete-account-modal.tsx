'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { authService } from '@/services/auth';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, User, FileText, Music, Library } from 'lucide-react';

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string;
}

export function DeleteAccountModal({
  open,
  onOpenChange,
  username,
}: DeleteAccountModalProps) {
  const router = useRouter();
  const [confirmUsername, setConfirmUsername] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmUsername === username;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    try {
      await authService.deleteAccount();
      toast.success('Account deleted successfully');
      onOpenChange(false);
      router.push('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmUsername('');
    }
    onOpenChange(newOpen);
  };

  const deletionItems = [
    { icon: User, label: 'Your profile and avatar' },
    { icon: FileText, label: 'All your posts' },
    { icon: Music, label: 'Connected music services' },
    { icon: Library, label: 'Your music library data' },
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
        <SheetHeader className="space-y-4 pb-2">
          {/* Warning Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FF004C]/10 ring-8 ring-[#FF004C]/5">
            <AlertTriangle className="h-8 w-8 text-[#FF004C]" />
          </div>

          <SheetTitle className="text-center text-2xl font-bold text-foreground font-teko tracking-wide">
            Delete Account
          </SheetTitle>

          <SheetDescription asChild>
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                This action <span className="text-[#FF004C] font-semibold">cannot be undone</span>.
                This will permanently delete your account and all associated data.
              </p>
            </div>
          </SheetDescription>
        </SheetHeader>

        {/* Data deletion list */}
        <div className="my-6 rounded-lg bg-[#FF004C]/5 border border-[#FF004C]/20 p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            The following will be permanently deleted:
          </p>
          <ul className="space-y-3">
            {deletionItems.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-foreground/80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FF004C]/10">
                  <Icon className="h-4 w-4 text-[#FF004C]" />
                </div>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirmation input */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-muted-foreground">
            To confirm deletion, type your username: <span className="font-mono font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded">{username}</span>
          </p>
          <TextField
            label=""
            inputSize="lg"
            value={confirmUsername}
            onChange={(e) => setConfirmUsername(e.target.value)}
            placeholder="Enter your username"
            className="w-full"
          />
          {confirmUsername && !isConfirmValid && (
            <p className="text-xs text-[#FF004C]">Username doesn&apos;t match</p>
          )}
        </div>

        <SheetFooter className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="flex-1 border-border-dark hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
            className="flex-1 bg-[#FF004C] hover:bg-[#CC003D] text-white border-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete My Account'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
