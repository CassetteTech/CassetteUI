import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/** False during the server render and hydration, true after; for values that only the client knows. */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
