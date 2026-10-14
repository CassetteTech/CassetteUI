'use client';

/** Lets a post owner update its caption, visibility, comment setting, and a playlist's own links. */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Switch } from '@/components/ui/switch';
import { PlaylistLinkFields } from '@/components/features/post/playlist-link-fields';
import { useUpdatePost } from '@/hooks/use-music';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { PostPrivacy } from '@/types';
import { appLogger } from '@/lib/observability/logger';
import { useSubscriberPostEligibility } from '@/hooks/use-curator';
import { apiService, ApiError } from '@/services/api';
import { getPlatformDefinition, normalizePlatformUiKey } from '@/lib/platforms';
import {
  curatorLinkPlatforms,
  fromBridgePlatformLinks,
  type ByService,
  playlistLinkErrors,
  toBridgePlatformLinks,
} from '@/lib/playlist-copy-placement';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const MAX_DESCRIPTION_LENGTH = 500;

export type PostChanges = {
  description?: string;
  privacy?: PostPrivacy;
  commentsEnabled?: boolean;
  /** A playlist's own links as saved, by service. */
  curatorLinks?: ByService<string>;
};

interface EditPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  currentDescription: string;
  currentPrivacy?: PostPrivacy;
  currentCommentsEnabled?: boolean;
  /** The post is the owner's own playlist post, which takes the owner's link for each service. */
  playlistLinksEditable?: boolean;
  /** Runs after a save with only the fields that changed. */
  onSuccess?: (changes: PostChanges) => void;
  /** Without a sheet trigger, Radix focuses nothing on close; a caller can focus its real opener here. */
  onCloseAutoFocus?: (event: Event) => void;
}

export function EditPostModal({
  open,
  onOpenChange,
  postId,
  currentDescription,
  currentPrivacy = 'public',
  currentCommentsEnabled = true,
  playlistLinksEditable = false,
  onSuccess,
  onCloseAutoFocus,
}: EditPostModalProps) {
  const [description, setDescription] = useState(currentDescription);
  const [privacy, setPrivacy] = useState<PostPrivacy>(currentPrivacy);
  const [commentsEnabled, setCommentsEnabled] = useState(currentCommentsEnabled);
  // Only the fields the owner edited; every other field shows the saved link.
  const [linkEdits, setLinkEdits] = useState<ByService<string>>({});
  const [linkErrors, setLinkErrors] = useState<ByService<string>>({});
  // A caller can open the sheet without knowing a setting (a list item may carry a default), so a
  // control counts as changed once touched, and is then saved as shown.
  const touched = useRef({ privacy: false, commentsEnabled: false });
  const updatePost = useUpdatePost();
  const canUseSubscriberPosts = useSubscriberPostEligibility(open);
  const showSubscriberOption = canUseSubscriberPosts || currentPrivacy === 'subscriber';
  // Every caller opens the sheet with a list item at most, so the links come from the post itself.
  const playlistPost = useQuery({
    queryKey: ['post', postId, 'owner-links'],
    queryFn: () => apiService.fetchPostById(postId),
    enabled: open && playlistLinksEditable,
  });
  const sourcePlatform = normalizePlatformUiKey(playlistPost.data?.sourcePlatform);
  const savedLinks = fromBridgePlatformLinks(playlistPost.data?.curatorLinks);
  const links = { ...savedLinks, ...linkEdits };
  // Every way out of the sheet comes through here, so it always reopens on the saved links.
  const changeOpen = (next: boolean) => {
    if (!next) {
      setLinkEdits({});
      setLinkErrors({});
    }
    onOpenChange(next);
  };

  // Reset description when modal opens with new data
  useEffect(() => {
    if (open) {
      setDescription(currentDescription);
      setPrivacy(currentPrivacy);
      setCommentsEnabled(currentCommentsEnabled);
      touched.current = { privacy: false, commentsEnabled: false };
    }
  }, [open, currentDescription, currentPrivacy, currentCommentsEnabled]);

  const handleSave = async () => {
    // Only what the owner changed goes to Bridge, so a stale or default setting from the caller
    // never overwrites the saved one.
    const changes: PostChanges = {};
    if (description !== currentDescription) changes.description = description;
    if (touched.current.privacy) changes.privacy = privacy;
    if (touched.current.commentsEnabled) changes.commentsEnabled = commentsEnabled;

    const changedLinks: ByService<string | null> = {};
    for (const platform of playlistPost.data ? curatorLinkPlatforms(sourcePlatform) : []) {
      const next = links[platform]?.trim() ?? '';
      if (next !== (savedLinks[platform] ?? '')) changedLinks[platform] = next || null;
    }
    const problems = playlistLinkErrors(links);
    setLinkErrors(problems);
    if (Object.keys(problems).length > 0) return;

    const linksChanged = Object.keys(changedLinks).length > 0;
    if (Object.keys(changes).length === 0 && !linksChanged) {
      changeOpen(false);
      return;
    }
    try {
      await updatePost.mutateAsync({
        postId,
        ...changes,
        platformLinks: linksChanged ? toBridgePlatformLinks(changedLinks) : undefined,
      });
      toast.success('Post updated successfully');
      changeOpen(false);
      if (linksChanged) {
        const curatorLinks: ByService<string> = {};
        for (const platform of curatorLinkPlatforms(sourcePlatform)) {
          const url = links[platform]?.trim();
          if (url) curatorLinks[platform] = url;
        }
        changes.curatorLinks = curatorLinks;
      }
      onSuccess?.(changes);
    } catch (error) {
      // A refused link shows on its own field; Bridge names the platform it was set for.
      const refusedPlatform = error instanceof ApiError ? getPlatformDefinition(error.platform)?.uiKey : undefined;
      if (refusedPlatform) {
        setLinkErrors({ [refusedPlatform]: getUserFacingApiErrorMessage(error) });
        return;
      }
      appLogger.error('post_update_failed', { error, route: '/post/[id]', post_id: postId });
      toast.error('Failed to update post. Please try again.');
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(value);
    }
  };

  const handlePrivacyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if (value === 'public' || value === 'private' || value === 'subscriber') {
      setPrivacy(value);
      touched.current.privacy = true;
    }
  };

  const charactersRemaining = MAX_DESCRIPTION_LENGTH - description.length;
  const isOverLimit = charactersRemaining < 0;

  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto" onCloseAutoFocus={onCloseAutoFocus}>
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
            className="min-h-[120px] resize-none bg-card border-border/60 text-sm placeholder:text-muted-foreground/60 dark:bg-secondary dark:text-secondary-foreground dark:placeholder:text-secondary-foreground/50"
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
            onChange={handlePrivacyChange}
            disabled={updatePost.isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
            {showSubscriberOption && <option value="subscriber">Members only</option>}
          </select>
          <p className="text-xs text-muted-foreground">
            {privacy === 'subscriber'
              ? 'Only fans with an active membership can open this post from your curator page.'
              : 'Private posts only appear on your profile to you. Anyone with the link can still view them.'}
          </p>
        </div>

        <div className="space-y-2 px-4">
          <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-muted/20 px-3 py-2">
            <div>
              <Label htmlFor="post-comments-enabled" className="text-sm text-foreground">Allow comments</Label>
              <p className="text-xs text-muted-foreground">Turn off to stop new comments on this post.</p>
            </div>
            <Switch
              id="post-comments-enabled"
              checked={commentsEnabled}
              onCheckedChange={(checked) => {
                setCommentsEnabled(checked);
                touched.current.commentsEnabled = true;
              }}
              disabled={updatePost.isPending}
            />
          </div>
        </div>

        {playlistLinksEditable && (
          <section aria-labelledby="post-playlist-links-heading" className="space-y-3 px-4">
            <h3 id="post-playlist-links-heading" className="text-sm font-medium text-foreground">Where fans listen</h3>
            {playlistPost.isError ? (
              <p role="alert" className="text-sm text-destructive">Your links could not load. Close this and try again.</p>
            ) : playlistPost.data ? (
              <PlaylistLinkFields
                sourcePlatform={sourcePlatform}
                values={links}
                errors={linkErrors}
                onChange={(platform, value) => {
                  setLinkEdits((current) => ({ ...current, [platform]: value }));
                  setLinkErrors((current) => ({ ...current, [platform]: undefined }));
                }}
                disabled={updatePost.isPending}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Loading your links…</p>
            )}
          </section>
        )}

        <SheetFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => changeOpen(false)}
            disabled={updatePost.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            data-testid="edit-post-save"
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
