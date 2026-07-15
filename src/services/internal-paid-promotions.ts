import { apiService } from '@/services/api';
import type {
  InternalPaidPromotionCampaignSummary,
  InternalPaidPromotionDeliverableInput,
} from '@/types';
import {
  parseInternalPaidPromotionAction,
  parseInternalPaidPromotionArray,
  parseInternalPaidPromotionCampaignDetail,
  parseInternalPaidPromotionCampaignSummary,
  parseInternalPaidPromotionDeliverable,
  parseInternalPaidPromotionException,
  parseInternalPaidPromotionRefund,
} from './internal-paid-promotion-contract';

export {
  PAID_PROMOTION_CAMPAIGN_STATUSES,
  PAID_PROMOTION_DELIVERABLE_CHANNELS,
  PAID_PROMOTION_DELIVERABLE_STATUSES,
  PAID_PROMOTION_PAYMENT_STATUSES,
  parseInternalPaidPromotionAction,
  parseInternalPaidPromotionCampaignDetail,
  parseInternalPaidPromotionCampaignSummary,
  parseInternalPaidPromotionDeliverable,
  parseInternalPaidPromotionException,
  parseInternalPaidPromotionRefund,
} from './internal-paid-promotion-contract';

class InternalPaidPromotionsService {
  async listCampaigns(params: {
    status?: string;
    paymentStatus?: string;
    hasOpenExceptions?: boolean;
  } = {}): Promise<InternalPaidPromotionCampaignSummary[]> {
    const response = await apiService.getInternalPaidPromotionCampaigns(params);
    return parseInternalPaidPromotionArray(response, 'campaigns').map((campaign, index) =>
      parseInternalPaidPromotionCampaignSummary(campaign, `campaigns[${index}]`)
    );
  }

  async getCampaign(campaignId: string, signal?: AbortSignal) {
    return parseInternalPaidPromotionCampaignDetail(
      await apiService.getInternalPaidPromotionCampaign(campaignId, { signal })
    );
  }

  async quote(campaignId: string, rateCardId: string) {
    return parseInternalPaidPromotionAction(await apiService.quoteInternalPaidPromotion(campaignId, rateCardId));
  }

  async approve(campaignId: string) {
    return parseInternalPaidPromotionAction(await apiService.approveInternalPaidPromotion(campaignId));
  }

  async reject(campaignId: string) {
    return parseInternalPaidPromotionAction(await apiService.rejectInternalPaidPromotion(campaignId));
  }

  async transition(campaignId: string, status: 'fulfilling' | 'delivered' | 'completed') {
    return parseInternalPaidPromotionAction(await apiService.transitionInternalPaidPromotion(campaignId, status));
  }

  async createDeliverable(campaignId: string, input: InternalPaidPromotionDeliverableInput) {
    return parseInternalPaidPromotionDeliverable(
      await apiService.createInternalPaidPromotionDeliverable(campaignId, input)
    );
  }

  async updateDeliverable(
    campaignId: string,
    deliverableId: string,
    input: InternalPaidPromotionDeliverableInput
  ) {
    return parseInternalPaidPromotionDeliverable(
      await apiService.updateInternalPaidPromotionDeliverable(campaignId, deliverableId, input)
    );
  }

  async removeDeliverable(campaignId: string, deliverableId: string) {
    return parseInternalPaidPromotionDeliverable(
      await apiService.removeInternalPaidPromotionDeliverable(campaignId, deliverableId)
    );
  }

  async initiateRefund(campaignId: string, amountMinor?: number) {
    return parseInternalPaidPromotionRefund(
      await apiService.initiateInternalPaidPromotionRefund(campaignId, amountMinor)
    );
  }

  async listExceptions(params: { status?: string; kind?: string } = {}) {
    const response = await apiService.getInternalPaidPromotionExceptions(params);
    return parseInternalPaidPromotionArray(response, 'exceptions').map((exception, index) =>
      parseInternalPaidPromotionException(exception, `exceptions[${index}]`)
    );
  }

  async getException(exceptionId: string) {
    return parseInternalPaidPromotionException(
      await apiService.getInternalPaidPromotionException(exceptionId)
    );
  }

  async resolveException(exceptionId: string) {
    return parseInternalPaidPromotionException(
      await apiService.resolveInternalPaidPromotionException(exceptionId)
    );
  }
}

export const internalPaidPromotionsService = new InternalPaidPromotionsService();
