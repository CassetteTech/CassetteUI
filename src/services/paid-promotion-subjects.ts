import type { PaidPromotionSubject } from '@/types';
import { apiService } from './api';
import { parsePaidPromotionSubjects } from './paid-promotion-subject-contract';

class PaidPromotionSubjectsService {
  async listOwned(): Promise<PaidPromotionSubject[]> {
    return parsePaidPromotionSubjects(await apiService.getPaidPromotionSubjects());
  }

  async listInternal(): Promise<PaidPromotionSubject[]> {
    return parsePaidPromotionSubjects(await apiService.getInternalPaidPromotionSubjects());
  }
}

export const paidPromotionSubjectsService = new PaidPromotionSubjectsService();

export {
  parsePaidPromotionSubject,
  parsePaidPromotionSubjects,
} from './paid-promotion-subject-contract';
