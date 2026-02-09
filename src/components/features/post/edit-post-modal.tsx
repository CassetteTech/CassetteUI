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
import { Label } from '@/components/ui/label';
import { useUpdatePost } from '@/hooks/use-music';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { PostPrivacy } from '@/types';

const MAX_DESCRIPTION_LENGTH = 500;

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  currentDescription: string;
  currentPrivacy?: PostPrivacy;
  onSuccess?: (data: { description: string; privacy: PostPrivacy }) => void;
}

export function EditPostModal({
  open,
  onOpenChange,
  postId,
  currentDescription,
  currentPrivacy = 'public',
  onSuccess,
}: EditPostModalProps) {
  const [description, setDescription] = useState(currentDescription);
  const [privacy, setPrivacy] = useState<PostPrivacy>(currentPrivacy);
  const updatePost = useUpdatePost();

  // Reset description when modal opens with new data
  useEffect(() => {
    if (open) {
      setDescription(currentDescription);
      setPrivacy(currentPrivacy);
    }
  }, [open, currentDescription, currentPrivacy]);

  const handleSave = async () => {
    try {
      await updatePost.mutateAsync({ postId, description, privacy });
      toast.success('Post updated successfully');
      onOpenChange(false);
      onSuccess?.({ description, privacy });
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

        <div className="space-y-2 px-4">
          <Label htmlFor="post-privacy" className="text-sm text-foreground">Post visibility</Label>
          <select
            id="post-privacy"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as PostPrivacy)}
            disabled={updatePost.isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Private posts only appear on your profile to you. Anyone with the link can still view them.
          </p>
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
