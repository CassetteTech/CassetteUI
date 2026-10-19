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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAuthState } from '@/hooks/use-auth';
import {
  emailPreferencesService,
  type EmailPreferenceCategory,
} from '@/services/email-preferences';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type SaveState = 'idle' | 'saving' | 'saved';

interface SaveRecord {
  state: SaveState;
  error: string | null;
  retryValue: boolean | null;
}

export interface EmailPreferenceRowModel {
  // Null until this account's stored value has loaded.
  enabled: boolean | null;
  saveState: SaveState;
  error: string | null;
  hasSaveRetry: boolean;
  onCheckedChange: (checked: boolean) => void;
  onRetry: () => void;
}

export interface EmailPreferencesSettingsModel {
  isLoading: boolean;
  loadError: string | null;
  onRetryLoad: () => void;
  productUpdates: EmailPreferenceRowModel;
  curatorDigest: EmailPreferenceRowModel;
}

type PreferenceValues = Record<EmailPreferenceCategory, boolean>;
type SaveRecords = Record<EmailPreferenceCategory, SaveRecord>;

const idleSave: SaveRecord = { state: 'idle', error: null, retryValue: null };
const idleSaves = { product_updates: idleSave, curator_digest: idleSave } satisfies SaveRecords;

const EmailPreferencesSettingsContext = createContext<EmailPreferencesSettingsModel | null>(null);

// The loaded values and save states belong to one account. Nothing from another
// account is shown, and a response that lands after the account changed is dropped.
interface AccountPreferences {
  userId: string;
  values: PreferenceValues;
}

function useEmailPreferencesSettings(activeUserId: string | null): EmailPreferencesSettingsModel {
  const [loaded, setLoaded] = useState<AccountPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailure, setLoadFailure] = useState<{ userId: string; message: string } | null>(null);
  const [saves, setSaves] = useState<SaveRecords>(idleSaves);
  // Every account change and every load starts a new generation; a load or
  // save response from an earlier generation is ignored.
  const generation = useRef(0);

  const setSave = (category: EmailPreferenceCategory, record: SaveRecord) =>
    setSaves((current) => ({ ...current, [category]: record }));
  const setValue = (userId: string, category: EmailPreferenceCategory, enabled: boolean) =>
    setLoaded((current) => current?.userId === userId
      ? { userId, values: { ...current.values, [category]: enabled } }
      : current);

  const loadPreferences = useCallback(async (userId: string, signal?: AbortSignal) => {
    const loadGeneration = ++generation.current;
    setIsLoading(true);
    setLoadFailure(null);
    setLoaded(null);
    setSaves(idleSaves);

    try {
      const response = await emailPreferencesService.get(signal);
      if (loadGeneration !== generation.current) return;
      setLoaded({
        userId,
        values: {
          product_updates: response.product_updates.enabled,
          curator_digest: response.curator_digest.enabled,
        },
      });
    } catch (loadError) {
      if (signal?.aborted || loadGeneration !== generation.current) return;
      setLoadFailure({
        userId,
        message: getUserFacingApiErrorMessage(
          loadError,
          'Could not load your email preferences. Please try again.',
        ),
      });
    } finally {
      if (!signal?.aborted && loadGeneration === generation.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (activeUserId === null) {
      generation.current += 1;
      return;
    }

    const controller = new AbortController();
    void loadPreferences(activeUserId, controller.signal);
    return () => controller.abort();
  }, [activeUserId, loadPreferences]);

  const current = activeUserId !== null && loaded?.userId === activeUserId ? loaded : null;
  const loadError = activeUserId !== null && loadFailure?.userId === activeUserId ? loadFailure.message : null;

  const savePreference = async (category: EmailPreferenceCategory, nextEnabled: boolean) => {
    if (current === null || saves[category].state === 'saving') return;

    const { userId } = current;
    const saveGeneration = generation.current;
    const previousEnabled = current.values[category];
    setValue(userId, category, nextEnabled);
    setSave(category, { state: 'saving', error: null, retryValue: null });

    try {
      const response = await emailPreferencesService.update(category, nextEnabled, 'settings');
      if (saveGeneration !== generation.current) return;
      // Only this row's value is taken from the response, so a save of the
      // other row that is still in flight keeps its own pending value.
      setValue(userId, category, response[category].enabled);
      setSave(category, { state: 'saved', error: null, retryValue: null });
    } catch (saveFailure) {
      if (saveGeneration !== generation.current) return;
      setValue(userId, category, previousEnabled);
      setSave(category, {
        state: 'idle',
        retryValue: nextEnabled,
        error: getUserFacingApiErrorMessage(
          saveFailure,
          'Could not save your email preference. Please try again.',
        ),
      });
    }
  };

  const row = (category: EmailPreferenceCategory): EmailPreferenceRowModel => {
    const save = current === null ? idleSave : saves[category];
    return {
      enabled: current?.values[category] ?? null,
      saveState: save.state,
      error: save.error,
      hasSaveRetry: save.retryValue !== null,
      onCheckedChange: (checked) => void savePreference(category, checked),
      onRetry: () => {
        if (save.retryValue !== null) {
          void savePreference(category, save.retryValue);
        }
      },
    };
  };

  return {
    isLoading: isLoading || (activeUserId !== null && current === null && loadError === null),
    loadError,
    onRetryLoad: () => {
      if (activeUserId !== null) void loadPreferences(activeUserId);
    },
    productUpdates: row('product_updates'),
    curatorDigest: row('curator_digest'),
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

function PreferenceRow({
  label,
  description,
  switchLabel,
  testId,
  statusTestId,
  savedText,
  row,
  isLoading,
  children,
}: {
  label: string;
  description: string;
  switchLabel: string;
  testId: string;
  statusTestId: string;
  savedText: string;
  row: EmailPreferenceRowModel;
  isLoading: boolean;
  children?: ReactNode;
}) {
  const controlId = `${useId()}-${testId}`;
  const descriptionId = `${controlId}-description`;

  return (
    <div className="py-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <label htmlFor={controlId} className="text-sm font-medium leading-none">
            {label}
          </label>
          <p id={descriptionId} className="mt-1.5 max-w-prose text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        {row.enabled !== null ? (
          <Switch
            id={controlId}
            checked={row.enabled}
            onCheckedChange={row.onCheckedChange}
            disabled={row.saveState === 'saving'}
            aria-label={switchLabel}
            aria-describedby={descriptionId}
            data-testid={testId}
          />
        ) : (
          isLoading && <Skeleton aria-hidden className="h-5 w-9 shrink-0 rounded-full" />
        )}
      </div>

      {children}
      {row.saveState !== 'idle' && (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite" data-testid={statusTestId}>
          {row.saveState === 'saving' ? 'Saving…' : savedText}
        </p>
      )}
      {row.error && (
        <div className="mt-3" role="alert">
          <p className="text-xs text-destructive">
            {row.error}
            {row.hasSaveRetry ? ' Your previous setting is still in place.' : ''}
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={row.onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}

export function EmailPreferencesSettings() {
  const model = useContext(EmailPreferencesSettingsContext);
  if (model === null) {
    throw new Error('EmailPreferencesSettings must be rendered inside its provider.');
  }

  const sectionRef = useRef<HTMLDivElement>(null);
  const productUpdatesSaveFailed = model.productUpdates.error !== null && model.productUpdates.hasSaveRetry;
  const curatorDigestSaveFailed = model.curatorDigest.error !== null && model.curatorDigest.hasSaveRetry;

  useEffect(() => {
    if ((productUpdatesSaveFailed || curatorDigestSaveFailed) && sectionRef.current?.checkVisibility() === false) {
      toast.error('Your email preference was not saved.', {
        description: 'Open the Account tab to try again.',
      });
    }
  }, [productUpdatesSaveFailed, curatorDigestSaveFailed]);

  const productUpdatesOff = model.productUpdates.enabled === false;

  return (
    <>
      <div ref={sectionRef}>
        <PreferenceRow
          label="Product updates and releases"
          description="Occasional emails to your account address, on by default. Turning this off does not affect account, security, or service emails."
          switchLabel="Receive Cassette product and release update emails"
          testId="settings-product-updates-email"
          statusTestId="email-preference-save-status"
          savedText="Saved. This can take a few minutes to take effect."
          row={model.productUpdates}
          isLoading={model.isLoading}
        >
          {/* The switches draw skeletons in place; the status is for screen readers only, so the rows keep their height. */}
          {model.isLoading && (
            <p className="sr-only" aria-live="polite">
              Loading email preferences…
            </p>
          )}
          {model.loadError && (
            <div className="mt-3" role="alert">
              <p className="text-xs text-destructive">{model.loadError}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={model.onRetryLoad}>
                Retry
              </Button>
            </div>
          )}
        </PreferenceRow>
      </div>
      <PreferenceRow
        label="Curator digest"
        description="Weekly on Mondays: up to five new public posts from curators you follow or support. Off by default."
        switchLabel="Receive the weekly curator digest email"
        testId="settings-curator-digest-email"
        statusTestId="curator-digest-save-status"
        savedText="Saved."
        row={model.curatorDigest}
        isLoading={model.isLoading}
      >
        {productUpdatesOff && (
          <p className="mt-2 max-w-prose text-xs text-muted-foreground" data-testid="curator-digest-product-updates-note">
            {model.curatorDigest.enabled
              ? 'Product updates are off, so the digest is paused. Your digest choice stays on and resumes when product updates are on.'
              : 'The digest also needs product updates to be on.'}
          </p>
        )}
      </PreferenceRow>
    </>
  );
}
