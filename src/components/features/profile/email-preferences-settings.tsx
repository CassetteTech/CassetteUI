'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuthState } from '@/hooks/use-auth';
import { emailPreferencesService } from '@/services/email-preferences';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type SaveState = 'idle' | 'saving' | 'saved';

export interface EmailPreferencesSettingsModel {
  enabled: boolean;
  isLoading: boolean;
  saveState: SaveState;
  error: string | null;
  hasSaveRetry: boolean;
  onCheckedChange: (checked: boolean) => void;
  onRetry: () => void;
}

const EmailPreferencesSettingsContext = createContext<EmailPreferencesSettingsModel | null>(null);

function useEmailPreferencesSettings(activeUserId: string | null): EmailPreferencesSettingsModel {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryValue, setRetryValue] = useState<boolean | null>(null);

  const loadPreference = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await emailPreferencesService.get(signal);
      setEnabled(response.product_updates.enabled);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(getUserFacingApiErrorMessage(
        loadError,
        'Could not load your email preference. Please try again.',
      ));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeUserId === null) return;

    const controller = new AbortController();
    void loadPreference(controller.signal);
    return () => controller.abort();
  }, [activeUserId, loadPreference]);

  const savePreference = async (nextEnabled: boolean) => {
    if (saveState === 'saving') return;

    const previousEnabled = enabled;
    setEnabled(nextEnabled);
    setSaveState('saving');
    setError(null);
    setRetryValue(null);

    try {
      const response = await emailPreferencesService.updateProductUpdates(
        nextEnabled,
        'settings',
      );
      setEnabled(response.product_updates.enabled);
      setSaveState('saved');
    } catch (saveError) {
      setEnabled(previousEnabled);
      setSaveState('idle');
      setRetryValue(nextEnabled);
      setError(getUserFacingApiErrorMessage(
        saveError,
        'Could not save your email preference. Please try again.',
      ));
    }
  };

  return {
    enabled,
    isLoading,
    saveState,
    error,
    hasSaveRetry: retryValue !== null,
    onCheckedChange: (checked) => void savePreference(checked),
    onRetry: () => {
      if (retryValue === null) {
        void loadPreference();
        return;
      }
      void savePreference(retryValue);
    },
  };
}

export function EmailPreferencesSettingsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuthState();
  const isProfileEditRoute = pathname.startsWith('/profile/') && pathname.endsWith('/edit');
  const activeUserId = isProfileEditRoute && !isLoading ? user?.id ?? null : null;
  const model = useEmailPreferencesSettings(activeUserId);

  return (
    <EmailPreferencesSettingsContext.Provider value={model}>
      {children}
    </EmailPreferencesSettingsContext.Provider>
  );
}

export function EmailPreferencesSettings() {
  const model = useContext(EmailPreferencesSettingsContext);
  if (model === null) {
    throw new Error('EmailPreferencesSettings must be rendered inside its provider.');
  }

  const controlId = `${useId()}-product-updates`;
  const rowRef = useRef<HTMLDivElement>(null);

  // A failed save can land after the person has moved to another settings tab,
  // where the inline error below is hidden; tell them where to retry.
  useEffect(() => {
    if (model.error && model.hasSaveRetry && rowRef.current?.checkVisibility() === false) {
      toast.error('Your email preference was not saved.', {
        description: 'Open the Account tab to try again.',
      });
    }
  }, [model.error, model.hasSaveRetry]);

  // One settings row: label and description on the left, the switch on the right.
  return (
    <div ref={rowRef} className="py-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <label htmlFor={controlId} className="text-sm font-medium leading-none">
            Product updates and releases
          </label>
          <p className="mt-1.5 max-w-prose text-xs text-muted-foreground">
            Occasional emails to your account address, on by default. Turning this off does not affect account, security, or service emails.
          </p>
        </div>
        <Switch
          id={controlId}
          checked={model.enabled}
          onCheckedChange={model.onCheckedChange}
          disabled={
            model.isLoading ||
            model.saveState === 'saving' ||
            model.error !== null && !model.hasSaveRetry
          }
          aria-label="Receive Cassette product and release update emails"
          data-testid="settings-product-updates-email"
        />
      </div>

      {model.isLoading && (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          Loading email preference…
        </p>
      )}
      {!model.isLoading && model.saveState !== 'idle' && (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite" data-testid="email-preference-save-status">
          {model.saveState === 'saving'
            ? 'Saving…'
            : 'Saved. This can take a few minutes to take effect.'}
        </p>
      )}
      {model.error && (
        <div className="mt-3" role="alert">
          <p className="text-xs text-destructive">
            {model.error}
            {model.hasSaveRetry ? ' Your previous setting is still in place.' : ''}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={model.onRetry}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
