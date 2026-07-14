'use client';

import { forwardRef, useCallback, useState } from 'react';
import { motion, AnimatePresence, type HTMLMotionProps } from 'framer-motion';
import { Check, Loader2, Share2 } from 'lucide-react';
import type { InternalSignupLinkTemplate } from '@/types';
import { isPostShareTemplate } from '@/lib/attribution/attribution-links';
import { apiService } from '@/services/api';
import { appLogger } from '@/lib/observability/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ShareCopyState = 'idle' | 'copied' | 'error';

interface PostShareButtonProps extends HTMLMotionProps<'button'> {
  copyState: ShareCopyState;
  onShare?: () => void;
}

// Shared by all three post layout branches so the toolbar Share affordance stays identical.
// Forwards ref + extra props so it can double as a Radix DropdownMenuTrigger for team accounts.
export const PostShareButton = forwardRef<HTMLButtonElement, PostShareButtonProps>(
  ({ copyState, onShare, className, onClick, ...rest }, ref) => (
    <motion.button
      ref={ref}
      {...rest}
      className={`inline-flex h-9 min-w-[120px] items-center justify-center gap-2 overflow-hidden rounded-none border-2 border-foreground px-4 font-mono text-[10px] font-bold uppercase tracking-[0.2em] transition-[color,background-color,box-shadow] duration-150 ${
        copyState === 'copied'
          ? 'bg-card text-success-text shadow-flat-2'
          : 'bg-primary text-primary-foreground shadow-flat-3 hover:bg-primary/90 hover:shadow-flat-4'
      } ${className ?? ''}`}
      onClick={(event) => {
        onClick?.(event);
        onShare?.();
      }}
      aria-label="Share"
      whileTap={{ scale: 0.97 }}
      animate={copyState === 'copied' ? { scale: [1, 1.03, 1] } : {}}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {copyState === 'copied' ? (
          <motion.span
            key="copied"
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Copied!</span>
          </motion.span>
        ) : (
          <motion.span
            key="share"
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <span
              aria-hidden="true"
              className="w-3.5 h-3.5 bg-current shrink-0"
              style={{
                WebkitMaskImage: "url(/images/ic_share.png)",
                maskImage: "url(/images/ic_share.png)",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
            />
            <span>Share</span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
);
PostShareButton.displayName = 'PostShareButton';

interface PostShareMenuProps {
  isTeamAccount: boolean;
  copyState: ShareCopyState;
  onPlainShare: () => void;
  onTemplateCopy: (template: InternalSignupLinkTemplate) => void;
  className?: string;
}

/**
 * Share affordance for the post page. Non-team accounts get the plain one-click
 * Share button (unchanged behavior, no template fetch). CassetteTeam accounts get a
 * menu with the plain share plus copy-with-attribution items for each active
 * post-destination link template, so marketing shares carry utm params back to the
 * attribution dashboard.
 */
export function PostShareMenu({
  isTeamAccount,
  copyState,
  onPlainShare,
  onTemplateCopy,
  className,
}: PostShareMenuProps) {
  const [templates, setTemplates] = useState<InternalSignupLinkTemplate[] | null>(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (templates !== null || templatesLoading) return;
    setTemplatesLoading(true);
    setTemplatesError(false);
    try {
      const items = await apiService.getInternalSignupLinkTemplates();
      setTemplates(items.filter((template) => template.isActive && isPostShareTemplate(template)));
    } catch (error) {
      appLogger.warn('post_share_templates_load_failed', { error, route: '/post/[id]' });
      setTemplatesError(true);
    } finally {
      setTemplatesLoading(false);
    }
  }, [templates, templatesLoading]);

  if (!isTeamAccount) {
    return <PostShareButton copyState={copyState} onShare={onPlainShare} className={className} />;
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void loadTemplates();
      }}
    >
      <DropdownMenuTrigger asChild>
        <PostShareButton copyState={copyState} className={className} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onClick={onPlainShare} className="gap-2">
          <Share2 className="h-3.5 w-3.5" />
          <span>Share</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Copy with attribution</DropdownMenuLabel>
        {templatesLoading ? (
          <DropdownMenuItem disabled className="gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Loading templates…</span>
          </DropdownMenuItem>
        ) : templatesError ? (
          <DropdownMenuItem disabled>Templates unavailable</DropdownMenuItem>
        ) : !templates?.length ? (
          <DropdownMenuItem disabled>No post templates — create one in Internal → Attribution</DropdownMenuItem>
        ) : (
          templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => onTemplateCopy(template)}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate">{template.name}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{template.source}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
