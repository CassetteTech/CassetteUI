import { useQuery } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';

export function usePaidPromotionAvailability() {
  return useQuery({
    queryKey: ['paid-promotion-availability'],
    queryFn: () => apiService.getPaidPromotionAvailability(),
  });
}

export function usePaidPromotionSalesEnabled(): boolean {
  return usePaidPromotionAvailability().data?.salesEnabled === true;
}

export function usePaidPromotionAccountVisible(): boolean {
  const { user } = useAuthState();
  const salesEnabled = usePaidPromotionSalesEnabled();
  const ownedCampaigns = useQuery({
    queryKey: ['paid-promotion-campaigns', user?.id ?? null],
    queryFn: () => apiService.getPaidPromotionCampaigns(),
    enabled: Boolean(user?.id) && !salesEnabled,
  });
  return salesEnabled || (ownedCampaigns.data?.length ?? 0) > 0;
}
