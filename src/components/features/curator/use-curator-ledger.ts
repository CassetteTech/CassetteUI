'use client';

/** Loads enough of the curator's earnings ledger to cover the dashboard's
    trailing window for the Studio's balance and chart figures. The ledger is
    newest-first: the first request bursts pages until one reaches past the
    window or comes back short; "load more" then adds one page at a time. */

import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { fetchCuratorEarnings, monthStart, type CuratorEarningsHistoryItem } from '@/services/curator-earnings';

/** The API's largest page. */
const ledgerPageSize = 50;
/** Bounds the initial burst; beyond this the UI says which window it covers. */
const ledgerPageCap = 4;
const ledgerMonths = 12;
const windowStart = () => monthStart(ledgerMonths - 1);

type LedgerChunk = {
  activeMemberCount: number;
  totalItems: number;
  items: CuratorEarningsHistoryItem[];
  nextPage: number | null;
};

export type CuratorLedger = {
  activeMemberCount: number;
  items: CuratorEarningsHistoryItem[];
  totalItems: number;
  /** True when every event in the trailing `ledgerMonths` has been loaded. */
  coversWindow: boolean;
};

function selectLedger(data: InfiniteData<LedgerChunk>): CuratorLedger {
  const items = data.pages.flatMap((chunk) => chunk.items);
  const first = data.pages[0];
  const oldest = items.at(-1);
  return {
    activeMemberCount: first.activeMemberCount,
    items,
    totalItems: first.totalItems,
    coversWindow: items.length >= first.totalItems ||
      (oldest !== undefined && new Date(oldest.occurredAtUtc) < windowStart()),
  };
}

export function useCuratorLedger(enabled: boolean) {
  const { user } = useAuthState();
  return useInfiniteQuery({
    queryKey: ['curator-earnings', user?.id ?? null, 'ledger', ledgerMonths],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }): Promise<LedgerChunk> => {
      const burst = pageParam === 1 ? ledgerPageCap : 1;
      const items: CuratorEarningsHistoryItem[] = [];
      let page = pageParam;
      let result = await fetchCuratorEarnings(page, ledgerPageSize, signal);
      const { activeMemberCount, totalItems } = result;
      for (;;) {
        items.push(...result.items);
        const oldest = result.items.at(-1);
        if (result.items.length < ledgerPageSize || page * ledgerPageSize >= totalItems) {
          return { activeMemberCount, totalItems, items, nextPage: null };
        }
        page += 1;
        if (page - pageParam >= burst || !oldest || new Date(oldest.occurredAtUtc) < windowStart()) {
          return { activeMemberCount, totalItems, items, nextPage: page };
        }
        result = await fetchCuratorEarnings(page, ledgerPageSize, signal);
      }
    },
    getNextPageParam: (last) => last.nextPage ?? undefined,
    select: selectLedger,
    enabled: Boolean(user?.id) && enabled,
    staleTime: 0,
  });
}
