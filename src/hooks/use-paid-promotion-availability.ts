import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/services/api';

export function usePaidPromotionAvailability() {
  return useQuery({
    queryKey: ['paid-promotion-availability'],
    queryFn: () => apiService.getPaidPromotionAvailability(),
  });
}
