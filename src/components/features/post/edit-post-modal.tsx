'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUpdatePost } from '@/hooks/use-music';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const MAX_DESCRIPTION_LENGTH = 500;

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  currentDescription: string;
  onSuccess?: (newDescription: string) => void;
}

export function EditPostModal({
  open,
  onOpenChange,
  postId,
  currentDescription,
  onSuccess,
}: EditPostModalProps) {
  const [description, setDescription] = useState(currentDescription);
  const updatePost = useUpdatePost();

  // Reset description when modal opens with new data
  useEffect(() => {
    if (open) {
      setDescription(currentDescription);
    }
  }, [open, currentDescription]);

  const handleSave = async () => {
    try {
      await updatePost.mutateAsync({ postId, description });
      toast.success('Post updated successfully');
      onOpenChange(false);
      onSuccess?.(description);
    } catch (error) {
      console.error('Failed to update post:', error);
      toast.error('Failed to update post. Please try again.');
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
    }
  };

  const charactersRemaining = MAX_DESCRIPTION_LENGTH - description.length;
  const isOverLimit = charactersRemaining < 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md">
        <SheetHeader>
          <SheetTitle className="text-foreground">Edit Post</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Update your description for this post.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-2 px-4">
          <Textarea
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Add a description..."
            className="min-h-[120px] resize-none"
            disabled={updatePost.isPending}
          />
          <div className={`text-right text-sm ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
            {charactersRemaining} characters remaining
          </div>
        </div>

        <SheetFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={updatePost.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updatePost.isPending || isOverLimit}
          >
            {updatePost.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
