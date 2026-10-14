export const LAMBDA_WARMUP_STORAGE_KEY = 'cassette_lambda_warmup_last_requested_at';
export const LAMBDA_WARMUP_INTERVAL_MS = 5 * 60 * 1000;

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
    if (Math.abs(now - lastRequestedAt) < LAMBDA_WARMUP_INTERVAL_MS) return false;
    storage.setItem(LAMBDA_WARMUP_STORAGE_KEY, String(now));
  } catch {
    // ponytail: no warmup when sessionStorage is blocked, so focus events cannot flood Bridge;
    // add an in-memory throttle if those browsers need warm conversions.
    return false;
  }

  options.send().catch(() => undefined);
  return true;
}
