'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
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
  syncMessage: string | null;
  onCheckedChange: (checked: boolean) => void;
  onRetry: () => void;
}

const EmailPreferencesSettingsContext = createContext<EmailPreferencesSettingsModel | null>(null);

function getSyncMessage(enabled: boolean, syncStatus: string | null, sendEligible: boolean) {
  if (!enabled || syncStatus === null) return null;
  if (syncStatus === 'pending') return 'Email provider sync is pending.';
  if (syncStatus === 'failed' || syncStatus === 'dead') {
    return 'Your preference is saved, but email provider sync needs attention.';
  }
  if (syncStatus === 'not_configured') return 'Email provider sync has not started.';
  if (syncStatus === 'synced' && !sendEligible) {
    return 'Your preference is saved. Product update delivery is currently paused.';
  }
  if (syncStatus !== 'synced') return 'Email provider sync status is unavailable.';
  return null;
}

function useEmailPreferencesSettings(activeUserId: string | null): EmailPreferencesSettingsModel {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [retryValue, setRetryValue] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [sendEligible, setSendEligible] = useState(false);

  const loadPreference = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await emailPreferencesService.get(signal);
      setEnabled(response.product_updates.enabled);
      setSyncStatus(response.product_updates.syncStatus);
      setSendEligible(response.product_updates.sendEligible);
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
      setSyncStatus(response.product_updates.syncStatus);
      setSendEligible(response.product_updates.sendEligible);
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

  const syncMessage = getSyncMessage(enabled, syncStatus, sendEligible);

  return {
    enabled,
    isLoading,
    saveState,
    error,
    hasSaveRetry: retryValue !== null,
    syncMessage,
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

  const id = useId();
  const headingId = `${id}-heading`;
  const controlId = `${id}-product-updates`;

  return (
    <section className="border-t border-border/70 pt-5" aria-labelledby={headingId}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        Email preferences
      </p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-sm font-medium text-foreground">
            Product updates and releases
          </h2>
          <label htmlFor={controlId} className="mt-1 block text-xs text-muted-foreground">
            Email me occasional Cassette product updates and release announcements. I can unsubscribe at any time.
          </label>
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
          aria-label="Email me Cassette product updates and release announcements"
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
          {model.saveState === 'saving' ? 'Saving…' : 'Saved.'}
        </p>
      )}
      {!model.isLoading && model.syncMessage && (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="email-preference-sync-status">
          {model.syncMessage}
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
    </section>
  );
}
