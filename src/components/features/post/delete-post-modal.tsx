'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useDeletePost } from '@/hooks/use-music';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

interface DeletePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postTitle: string;
  onSuccess?: () => void;
}

export function DeletePostModal({
  open,
  onOpenChange,
  postId,
  postTitle,
  onSuccess,
}: DeletePostModalProps) {
  const deletePost = useDeletePost();

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(postId);
      toast.success('Post deleted successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post. Please try again.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <SheetTitle className="text-center text-xl font-bold text-foreground">
            Delete Post
          </SheetTitle>
          <SheetDescription className="text-center text-muted-foreground">
            Are you sure you want to delete your post for &ldquo;{postTitle}&rdquo;? This action cannot be undone.
          </SheetDescription>
        </SheetHeader>

        <SheetFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={deletePost.isPending}
            className="sm:order-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deletePost.isPending}
            className="sm:order-2"
          >
            {deletePost.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Post'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
