'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { shouldPollPaidPromotionCampaign } from '@/services/paid-promotion-lifecycle';
import type { PaidPromotionCampaign } from '@/types';

interface PaidPromotionCampaignPollingState {
  campaign: PaidPromotionCampaign | null;
  error: Error | null;
  isLoading: boolean;
  refresh: () => void;
}

export function usePaidPromotionCampaign(
  campaignId: string | null,
  intervalMs = 1000
): PaidPromotionCampaignPollingState {
  const [campaign, setCampaign] = useState<PaidPromotionCampaign | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(campaignId));
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!campaignId) {
      setCampaign(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let activeController: AbortController | null = null;

    setCampaign(null);
    setIsLoading(true);
    setError(null);

    const poll = async () => {
      activeController = new AbortController();

      try {
        const nextCampaign = await apiService.getPaidPromotionCampaign(campaignId, {
          signal: activeController.signal,
        });
        if (cancelled) return;

        setCampaign(nextCampaign);
        setError(null);
        setIsLoading(false);

        if (shouldPollPaidPromotionCampaign(nextCampaign)) {
          pollTimer = setTimeout(poll, intervalMs);
        }
      } catch (caught) {
        if (cancelled) return;

        setError(caught instanceof Error ? caught : new Error('Unable to load paid-promotion status.'));
        setIsLoading(false);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      activeController?.abort();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [campaignId, intervalMs, refreshKey]);

  return { campaign, error, isLoading, refresh };
}
