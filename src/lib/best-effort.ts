/** Web Storage throws in private browsing, over quota, and when the browser blocks it. */
export function tryStorage<T>(access: () => T, fallback: T): T {
  try {
    return access();
  } catch {
    return fallback;
  }
}

export function ignoreFailure<T>(work: Promise<T>): Promise<T | undefined>;
export function ignoreFailure<T>(work: () => T): T | undefined;
export function ignoreFailure<T>(work: Promise<T> | (() => T)): Promise<T | undefined> | T | undefined {
  if (work instanceof Promise) return work.catch(() => undefined);
  try {
    return work();
  } catch {
    return undefined;
  }
}
