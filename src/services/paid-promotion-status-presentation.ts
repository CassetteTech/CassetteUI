import type { PaidPromotionCampaign, PaidPromotionCampaignStatus } from '@/types';

/**
 * Customer-language presentation for every campaign lifecycle status: what
 * the status means, what happens next, and whose move it is. Unknown status
 * strings (a newer Bridge deploy) degrade to a refresh prompt instead of
 * leaking machine words.
 */

export type PaidPromotionStatusActor = 'you' | 'cassette' | 'none';

export type PaidPromotionStatusPresentation = {
  label: string;
  explanation: string;
  nextAction: string;
  actor: PaidPromotionStatusActor;
};

const STATUS_PRESENTATIONS: Record<PaidPromotionCampaignStatus, PaidPromotionStatusPresentation> = {
  draft: {
    label: 'Draft',
    explanation: 'You started this campaign but have not submitted it for payment yet.',
    nextAction: 'Continue to secure checkout when you are ready.',
    actor: 'you',
  },
  pending_payment: {
    label: 'Awaiting payment',
    explanation: 'Your campaign is saved and waiting on payment.',
    nextAction: 'Complete secure checkout to submit it for review.',
    actor: 'you',
  },
  in_review: {
    label: 'In review',
    explanation: 'Cassette is reviewing your campaign before any delivery begins.',
    nextAction: 'No action needed — this page updates when review finishes.',
    actor: 'cassette',
  },
  scheduled: {
    label: 'Scheduled',
    explanation: 'Your campaign passed review and delivery is being scheduled.',
    nextAction: 'No action needed — delivery starts on schedule.',
    actor: 'cassette',
  },
  fulfilling: {
    label: 'Delivering',
    explanation: 'Cassette is delivering your placements right now.',
    nextAction: 'No action needed — check back for delivery updates.',
    actor: 'cassette',
  },
  delivered: {
    label: 'Delivered',
    explanation: 'All placements for this campaign have been delivered.',
    nextAction: 'Review your campaign whenever you like.',
    actor: 'you',
  },
  completed: {
    label: 'Completed',
    explanation: 'This campaign is finished and closed out.',
    nextAction: 'Start a new campaign anytime.',
    actor: 'none',
  },
  expired: {
    label: 'Expired',
    explanation: 'This campaign expired before payment was completed.',
    nextAction: 'Start a new campaign if you would still like to promote this track.',
    actor: 'you',
  },
  canceled: {
    label: 'Canceled',
    explanation: 'This campaign was canceled and will not be delivered.',
    nextAction: 'Start a new campaign anytime.',
    actor: 'none',
  },
  rejected: {
    label: 'Not approved',
    explanation: 'Cassette reviewed this campaign and could not approve it for delivery.',
    nextAction: 'Your payment will be refunded in full — no action needed.',
    actor: 'cassette',
  },
  refunded_closed: {
    label: 'Refunded and closed',
    explanation: 'This campaign was closed and your payment refunded.',
    nextAction:
      'Nothing further is needed. Refunds usually appear on your statement within 5–10 business days.',
    actor: 'none',
  },
  on_hold: {
    label: 'On hold',
    explanation: 'Delivery is paused while Cassette resolves an issue with this campaign.',
    nextAction: 'No action needed — contact support if you have questions.',
    actor: 'cassette',
  },
};

const UNKNOWN_STATUS_PRESENTATION: PaidPromotionStatusPresentation = {
  label: 'Status unavailable',
  explanation: 'Cassette returned a campaign status this page does not recognize yet.',
  nextAction: 'Refresh the page, or contact support if this continues.',
  actor: 'none',
};

const DISPUTE_HOLD_PRESENTATION: PaidPromotionStatusPresentation = {
  label: 'On hold — payment dispute',
  explanation:
    'Delivery is paused because a dispute was opened on the payment with your card issuer.',
  nextAction:
    'If you opened the dispute in error, contact your bank to withdraw it; otherwise no action is needed.',
  actor: 'cassette',
};

export function getPaidPromotionStatusPresentation(
  campaign: Pick<PaidPromotionCampaign, 'status' | 'holdKind'>,
): PaidPromotionStatusPresentation {
  if (campaign.status === 'on_hold' && campaign.holdKind === 'payment_dispute') {
    return DISPUTE_HOLD_PRESENTATION;
  }
  return STATUS_PRESENTATIONS[campaign.status] ?? UNKNOWN_STATUS_PRESENTATION;
}

export function getPaidPromotionStatusLabel(status: string): string {
  return STATUS_PRESENTATIONS[status as PaidPromotionCampaignStatus]?.label
    ?? UNKNOWN_STATUS_PRESENTATION.label;
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  created: 'Checkout started',
  pending: 'Awaiting confirmation',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Not completed',
  expired: 'Checkout expired',
  refund_pending: 'Refund in progress',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  disputed: 'Disputed',
  charged_back: 'Charged back',
};

export function getPaidPromotionPaymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? 'Status unavailable';
}

const ELEMENT_TYPE_LABELS: Record<string, string> = {
  track: 'Track',
  album: 'Album',
  artist: 'Artist',
  playlist: 'Playlist',
};

// A campaign subject always has a type, so an unrecognized one (a newer Bridge
// deploy) still gets a badge rather than an empty slot.
export function getPaidPromotionElementTypeLabel(elementType: string): string {
  return ELEMENT_TYPE_LABELS[elementType] ?? 'Subject';
}
