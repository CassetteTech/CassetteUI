// sessionStorage is scoped to one tab, so this throttles warmups per tab.
export const LAMBDA_WARMUP_STORAGE_KEY = 'cassette_lambda_warmup_last_requested_at';
export const LAMBDA_WARMUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Sends a Lambda warmup at most once per interval per tab and returns whether it sent one.
 * It never throws and never waits for the warmup, so a conversion is never blocked by it.
 */
export function requestLambdaWarmup(options: {
  enabled: boolean;
  getStorage: () => Pick<Storage, 'getItem' | 'setItem'>;
  send: () => Promise<void>;
  now?: number;
}): boolean {
  if (!options.enabled) return false;
  const now = options.now ?? Date.now();

  try {
    const storage = options.getStorage();
    const lastRequestedAt = Number(storage.getItem(LAMBDA_WARMUP_STORAGE_KEY));
    // Math.abs: a timestamp from a clock that moved back does not block warmups.
    if (Math.abs(now - lastRequestedAt) < LAMBDA_WARMUP_INTERVAL_MS) return false;
    storage.setItem(LAMBDA_WARMUP_STORAGE_KEY, String(now));
  } catch {
    // ponytail: no warmup when sessionStorage is blocked, so focus events cannot flood Bridge;
    // add an in-memory throttle if those browsers need warm conversions.
    return false;
  }

  // The API client already logs the failure; a warmup error must not reach the caller.
  options.send().catch(() => undefined);
  return true;
}
