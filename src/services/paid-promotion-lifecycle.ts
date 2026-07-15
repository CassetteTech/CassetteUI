import type { PaidPromotionCampaign } from '@/types';

export type PaidPromotionReturnState =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'expired'
  | 'unavailable';

export function isPaidPromotionCampaignId(value: string): boolean {
  return /^pmc_[0-9A-Za-z]+$/.test(value);
}

export function getPaidPromotionReturnState(
  campaign: PaidPromotionCampaign
): PaidPromotionReturnState {
  switch (campaign.paymentStatus) {
    case 'created':
    case 'pending':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'paid':
      return 'paid';
    case 'failed':
      return 'failed';
    case 'expired':
      return 'expired';
    default:
      return 'unavailable';
  }
}

export function shouldPollPaidPromotionCampaign(
  campaign: PaidPromotionCampaign
): boolean {
  const state = getPaidPromotionReturnState(campaign);
  return state === 'pending' || state === 'processing';
}
