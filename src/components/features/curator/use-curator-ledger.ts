'use client';

import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { fetchCuratorEarnings, monthStart, type CuratorEarningsBalances, type CuratorEarningsHistoryItem } from '@/services/curator-earnings';

const ledgerPageSize = 50;
const ledgerPageCap = 4;
const ledgerMonths = 12;
const windowStart = () => monthStart(ledgerMonths - 1);

type LedgerChunk = {
  balances: CuratorEarningsBalances;
  totalItems: number;
  items: CuratorEarningsHistoryItem[];
  nextPage: number | null;
};

export type CuratorLedger = {
  balances: CuratorEarningsBalances;
  items: CuratorEarningsHistoryItem[];
  totalItems: number;
  coversWindow: boolean;
};

function selectLedger(data: InfiniteData<LedgerChunk>): CuratorLedger {
  const items = data.pages.flatMap((chunk) => chunk.items);
  const first = data.pages[0];
  const oldest = items.at(-1);
  return {
    balances: first.balances,
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
      const { balances, totalItems } = result;
      for (;;) {
        items.push(...result.items);
        const oldest = result.items.at(-1);
        if (result.items.length < ledgerPageSize || page * ledgerPageSize >= totalItems) {
          return { balances, totalItems, items, nextPage: null };
        }
        page += 1;
        if (page - pageParam >= burst || !oldest || new Date(oldest.occurredAtUtc) < windowStart()) {
          return { balances, totalItems, items, nextPage: page };
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
