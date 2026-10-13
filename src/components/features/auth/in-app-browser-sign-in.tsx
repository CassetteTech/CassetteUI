'use client';

/** The one step that replaces Google sign-in inside a social app's embedded browser, where Google refuses it. */

import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { externalBrowserUrl, inAppBrowserHint, type InAppBrowser } from '@/utils/in-app-browser';
import { browserHandoffPath } from '@/utils/profile-action-intent';

// The flat, bordered look of the Google button that this step replaces.
const primaryActionClassName =
  'w-full h-11 rounded-none border-2 border-foreground bg-[hsl(var(--cassette-white))] dark:bg-background text-foreground font-bold text-sm shadow-flat-3 hover:bg-[hsl(var(--cassette-white))] hover:-translate-y-0.5 hover:shadow-flat-5 transition-[transform,box-shadow]';

export function InAppBrowserSignIn({
  browser,
  handoffPath,
  className,
}: {
  browser: InAppBrowser;
  /** The local path to open in the device browser. By default, sign-in that returns to this page. */
  handoffPath?: string;
  className?: string;
}) {
  const [copyFailed, setCopyFailed] = useState(false);
  // Rendered only in the browser: the server render never detects an in-app browser.
  const { origin, pathname, search } = window.location;
  const url = new URL(handoffPath ?? browserHandoffPath(`${pathname}${search}`), origin).toString();
  const openUrl = externalBrowserUrl(url, browser);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyFailed(false);
      toast.success('Link copied. Paste it in your browser.');
    } catch {
      setCopyFailed(true);
      toast.error('Could not copy. Select the link and copy it.');
    }
  };

  const copyButton = (
    <Button
      type="button"
      variant={openUrl ? 'ghost' : 'default'}
      onClick={() => void copyLink()}
      className={openUrl ? 'w-full' : primaryActionClassName}
    >
      <Copy aria-hidden />
      Copy link
    </Button>
  );

  return (
    <div className={cn('flex flex-col gap-3', className)} data-testid="in-app-browser-sign-in">
      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold">Open in your browser to sign in</h2>
        <p className="text-sm text-muted-foreground">
          Google sign-in does not work inside {browser.app}. Continue in Safari, Chrome, or your usual browser.
        </p>
      </div>
      {openUrl ? (
        <>
          <Button asChild className={primaryActionClassName}>
            <a href={openUrl}>
              <ExternalLink aria-hidden />
              Open in browser
            </a>
          </Button>
          {copyButton}
        </>
      ) : copyButton}
      {copyFailed && (
        <input
          readOnly
          value={url}
          aria-label="Link to open in your browser"
          onFocus={(event) => event.currentTarget.select()}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}
      <p className="text-center text-xs text-muted-foreground">{inAppBrowserHint(browser)}</p>
    </div>
  );
}
