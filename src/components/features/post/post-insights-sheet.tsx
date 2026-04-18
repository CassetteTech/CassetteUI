'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { BarChart3, XIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface PostInsightsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

export function PostInsightsSheet({
  open,
  onOpenChange,
}: PostInsightsSheetProps) {
  const isMobile = useIsMobile();

  const contentClasses = isMobile
    ? cn(
        'fixed inset-x-0 bottom-0 z-50 flex flex-col gap-0 h-[85vh] rounded-t-2xl border-t border-border bg-background shadow-2xl',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        'data-[state=open]:duration-[400ms] data-[state=closed]:duration-[280ms]',
        'data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)]',
        'data-[state=closed]:ease-[cubic-bezier(0.64,0,0.78,0)]',
        'will-change-transform',
      )
    : cn(
        'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col gap-0 border-l border-border bg-background shadow-2xl',
        'sm:max-w-md md:max-w-lg',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:slide-in-from-right-full data-[state=closed]:slide-out-to-right-full',
        'data-[state=open]:duration-[450ms] data-[state=closed]:duration-[300ms]',
        'data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)]',
        'data-[state=closed]:ease-[cubic-bezier(0.64,0,0.78,0)]',
        'will-change-transform',
      );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={isMobile}>
      <DialogPrimitive.Portal>
        {isMobile && (
          <DialogPrimitive.Overlay
            className={cn(
              'fixed inset-0 z-50 bg-black/50',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:duration-[300ms] data-[state=closed]:duration-[200ms]',
            )}
          />
        )}
        <DialogPrimitive.Content
          className={contentClasses}
          onInteractOutside={(event) => {
            if (!isMobile) {
              const target = event.target as HTMLElement | null;
              if (target?.closest('[data-insights-trigger]')) {
                event.preventDefault();
              }
            }
          }}
        >
          <DialogPrimitive.Title className="sr-only">Insights</DialogPrimitive.Title>

          {/* Header */}
          <div className="flex items-center gap-2 px-4 sm:px-5 pt-5 pb-3 border-b border-border">
            <BarChart3 className="size-4 text-muted-foreground" />
            <span className="font-atkinson text-sm font-bold text-foreground tracking-wide">Insights</span>
            <DialogPrimitive.Close
              className="ml-auto rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close insights"
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="rounded-full bg-muted/40 p-3">
                <BarChart3 className="size-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">Insights are on the way</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs">
                Detailed analytics for this post will appear here soon.
              </p>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
