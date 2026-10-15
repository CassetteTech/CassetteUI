import { useEffect, useEffectEvent } from 'react';

type ProviderRead<T> = { data: T | undefined; isFetchedAfterMount: boolean; isFetching: boolean };

/** The read a provider return may settle on: completed after this mount, never a cached snapshot from before the handoff. */
export function settlingData<T>(read: ProviderRead<T>): T | undefined {
  return read.isFetchedAfterMount && !read.isFetching ? read.data : undefined;
}

/** Stripe reports a change to Bridge by webhook, possibly after the user is back, so a provider return
    polls for a bounded time. An unchanged read proves nothing, so `onTimeout` ends the poll with neutral copy. */
export function useProviderReturnPoll<Flow extends string, T>({
  flow,
  polling,
  read,
  onRead,
  onTimeout,
  timeoutMs = 30_000,
}: {
  flow: Flow | null;
  polling: boolean;
  read: ProviderRead<T>;
  onRead: (flow: Flow, data: T) => void;
  onTimeout: (flow: Flow) => void;
  timeoutMs?: number;
}) {
  const handleRead = useEffectEvent(onRead);
  const handleTimeout = useEffectEvent(onTimeout);

  useEffect(() => {
    if (!flow || !polling) return;
    const timeout = window.setTimeout(() => handleTimeout(flow), timeoutMs);
    return () => window.clearTimeout(timeout);
  }, [flow, polling, timeoutMs]);

  const data = settlingData(read);
  useEffect(() => {
    if (flow && data !== undefined) handleRead(flow, data);
  }, [flow, data]);
}
