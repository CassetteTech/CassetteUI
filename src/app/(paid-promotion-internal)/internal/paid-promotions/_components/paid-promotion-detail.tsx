'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader, StatusPill } from '@/app/(sidebar)/internal/_components/kit';
import { internalPaidPromotionsService } from '@/services/internal-paid-promotions';
import type {
  InternalPaidPromotionCampaignDetail,
  InternalPaidPromotionDeliverable,
  InternalPaidPromotionException,
} from '@/types';
import { ActionDialog } from './action-dialog';
import { CampaignOverview } from './campaign-overview';
import { DeliverableDialog } from './deliverable-dialog';
import { DeliverablesPanel } from './deliverables-panel';
import { ExceptionsPanel } from './exceptions-panel';
import { errorMessage, formatState, statusTone } from './paid-promotion-utils';

type LifecycleAction = 'approve' | 'reject' | 'fulfilling' | 'delivered' | 'completed';

const LIFECYCLE_COPY: Record<LifecycleAction, { title: string; description: string; confirm: string }> = {
  approve: {
    title: 'Approve and schedule campaign',
    description: 'The Bridge will verify the current campaign and paid payment state before scheduling.',
    confirm: 'Approve and schedule',
  },
  reject: {
    title: 'Reject campaign',
    description: 'Reject this campaign after review. Payment and refund state will not be changed.',
    confirm: 'Reject campaign',
  },
  fulfilling: {
    title: 'Start fulfillment',
    description: 'Advance this scheduled campaign to fulfilling using the server state machine.',
    confirm: 'Start fulfillment',
  },
  delivered: {
    title: 'Mark campaign delivered',
    description: 'The Bridge will require active deliverables to be published or verified.',
    confirm: 'Mark delivered',
  },
  completed: {
    title: 'Complete campaign',
    description: 'Advance this delivered campaign to its completed fulfillment state.',
    confirm: 'Complete campaign',
  },
};

function nextLifecycleAction(campaign: InternalPaidPromotionCampaignDetail): LifecycleAction | null {
  if (!campaign.payment || !['paid', 'partially_refunded'].includes(campaign.payment.status)) {
    return null;
  }
  if (campaign.status === 'scheduled') return 'fulfilling';
  if (campaign.status === 'fulfilling') return 'delivered';
  if (campaign.status === 'delivered') return 'completed';
  return null;
}

function canRefund(campaign: InternalPaidPromotionCampaignDetail): boolean {
  if (!campaign.payment || !['paid', 'partially_refunded'].includes(campaign.payment.status)) return false;
  if (campaign.payment.refundableRemainderMinor === null ||
      campaign.payment.refundableRemainderMinor <= 0) return false;
  return ['in_review', 'scheduled', 'fulfilling', 'delivered', 'completed', 'rejected'].includes(campaign.status);
}

export function PaidPromotionDetail({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<InternalPaidPromotionCampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [busy, setBusy] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [rateCardId, setRateCardId] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [deliverableOpen, setDeliverableOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<InternalPaidPromotionDeliverable | null>(null);
  const [removingDeliverable, setRemovingDeliverable] = useState<InternalPaidPromotionDeliverable | null>(null);
  const [resolvingException, setResolvingException] = useState<InternalPaidPromotionException | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (silent = false) => {
    const currentRequest = ++requestId.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const nextCampaign = await internalPaidPromotionsService.getCampaign(campaignId);
      if (currentRequest !== requestId.current) return null;
      setCampaign(nextCampaign);
      setError(null);
      return null;
    } catch (nextError) {
      if (currentRequest !== requestId.current) return null;
      const message = errorMessage(nextError);
      if (!silent || message.startsWith('Invalid paid-promotion server response:')) {
        setCampaign(null);
      }
      setError(message);
      return message;
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (campaign?.payment?.status !== 'refund_pending') return undefined;

    let requestRunning = false;
    const interval = setInterval(() => {
      if (requestRunning) return;
      requestRunning = true;
      void load(true).finally(() => {
        requestRunning = false;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [campaign?.payment?.status, load]);

  const runMutation = async (message: string, mutation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await mutation();
      setAnnouncement(message);
      setLifecycleAction(null);
      setQuoteOpen(false);
      setRefundOpen(false);
      setRemovingDeliverable(null);
      setResolvingException(null);
      await load(true);
    } catch (nextError) {
      const mutationError = errorMessage(nextError);
      const refreshError = await load(true);
      setError(refreshError ?? mutationError);
    } finally {
      setBusy(false);
    }
  };

  const submitLifecycle = () => {
    if (!lifecycleAction) return;
    const mutation = lifecycleAction === 'approve'
      ? () => internalPaidPromotionsService.approve(campaignId)
      : lifecycleAction === 'reject'
        ? () => internalPaidPromotionsService.reject(campaignId)
        : () => internalPaidPromotionsService.transition(campaignId, lifecycleAction);
    void runMutation(`${LIFECYCLE_COPY[lifecycleAction].confirm} confirmed by the server.`, mutation);
  };

  const submitQuote = () => {
    const normalizedRateCardId = rateCardId.trim();
    if (!normalizedRateCardId) {
      setError('A server rate-card ID is required for a manual quote.');
      return;
    }
    void runMutation(
      'Manual quote created from the server-owned rate card.',
      () => internalPaidPromotionsService.quote(campaignId, normalizedRateCardId)
    );
  };

  const submitRefund = () => {
    const normalizedAmount = refundAmount.trim();
    if (normalizedAmount && !/^\d+$/.test(normalizedAmount)) {
      setError('Refund amount must be a positive whole number of minor currency units.');
      return;
    }
    const amountMinor = normalizedAmount ? Number(normalizedAmount) : undefined;
    if (amountMinor !== undefined && (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)) {
      setError('Refund amount must be a positive whole number of minor currency units.');
      return;
    }
    if (amountMinor !== undefined && amountMinor > refundableRemainderMinor) {
      setError(`Refund amount cannot exceed the server-returned remainder of ${refundableRemainderMinor} minor units.`);
      return;
    }
    void runMutation(
      'Refund initiation is pending provider webhook confirmation.',
      () => internalPaidPromotionsService.initiateRefund(campaignId, amountMinor)
    );
  };

  const removeDeliverable = () => {
    if (!removingDeliverable) return;
    void runMutation(
      'Deliverable removed from server truth.',
      () => internalPaidPromotionsService.removeDeliverable(campaignId, removingDeliverable.id)
    );
  };

  const resolveException = () => {
    if (!resolvingException) return;
    const exceptionId = resolvingException.id;
    void runMutation('Exception verified and resolved by the server.', async () => {
      const serverException = await internalPaidPromotionsService.getException(exceptionId);
      if (serverException.status !== 'open') {
        throw new Error('This exception is no longer open. Refresh the campaign before acting.');
      }
      const resolved = await internalPaidPromotionsService.resolveException(serverException.id);
      if (resolved.status !== 'resolved') {
        throw new Error('The server did not verify this exception as resolved.');
      }
    });
  };

  if (loading && !campaign) {
    return <output className="block p-6 text-sm text-muted-foreground">Loading paid-promotion campaign…</output>;
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/internal/paid-promotions"><ArrowLeft aria-hidden="true" /> Back to queue</Link>
        </Button>
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Campaign detail could not be shown.</p>
          <p className="mt-1">{error ?? 'The server returned no campaign.'}</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>Try again</Button>
      </div>
    );
  }

  const nextAction = nextLifecycleAction(campaign);
  const hasFulfillmentPayment = Boolean(
    campaign.payment && ['paid', 'partially_refunded'].includes(campaign.payment.status)
  );
  const canMutateDeliverables = hasFulfillmentPayment &&
    ['in_review', 'scheduled', 'fulfilling', 'delivered'].includes(campaign.status);
  const canManualQuote = campaign.status === 'pending_payment' &&
    (!campaign.payment || ['expired', 'failed'].includes(campaign.payment.status));
  const refundableRemainderMinor = campaign.payment?.refundableRemainderMinor ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/internal/paid-promotions"><ArrowLeft aria-hidden="true" /> Back to queue</Link>
      </Button>

      <SectionHeader
        section="Paid Promotions"
        title={campaign.track.title}
        actions={(
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void load(true)}>
            <RefreshCw aria-hidden="true" /> Refresh
          </Button>
        )}
      />

      <div className="flex flex-wrap items-center gap-2" aria-label="Campaign status and operations">
        <StatusPill tone={statusTone(campaign.status)} label={formatState(campaign.status)} />
        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !canManualQuote}
          onClick={() => {
            setError(null);
            setRateCardId('');
            setQuoteOpen(true);
          }}
        >
          Create manual quote
        </Button>
        {campaign.status === 'in_review' && hasFulfillmentPayment && (
          <>
            <Button type="button" size="sm" disabled={busy} onClick={() => {
              setError(null);
              setLifecycleAction('approve');
            }}>
              Approve
            </Button>
            <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => {
              setError(null);
              setLifecycleAction('reject');
            }}>
              Reject
            </Button>
          </>
        )}
        {nextAction && (
          <Button type="button" size="sm" disabled={busy} onClick={() => {
            setError(null);
            setLifecycleAction(nextAction);
          }}>
            {LIFECYCLE_COPY[nextAction].confirm}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !canRefund(campaign)}
          onClick={() => {
            setError(null);
            setRefundAmount('');
            setRefundOpen(true);
          }}
        >
          Initiate refund
        </Button>
      </div>

      <output className="sr-only" aria-live="polite">{announcement}</output>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <CampaignOverview campaign={campaign} />

      <DeliverablesPanel
        deliverables={campaign.deliverables}
        canMutate={canMutateDeliverables && !busy}
        onAdd={() => {
          setError(null);
          setSelectedDeliverable(null);
          setDeliverableOpen(true);
        }}
        onEdit={(deliverable) => {
          setError(null);
          setSelectedDeliverable(deliverable);
          setDeliverableOpen(true);
        }}
        onRemove={(deliverable) => {
          setError(null);
          setRemovingDeliverable(deliverable);
        }}
      />

      <ExceptionsPanel
        exceptions={campaign.exceptions}
        onResolve={(exception) => {
          setError(null);
          setResolvingException(exception);
        }}
      />

      {lifecycleAction && (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setLifecycleAction(null)}
          title={LIFECYCLE_COPY[lifecycleAction].title}
          description={LIFECYCLE_COPY[lifecycleAction].description}
          confirmLabel={LIFECYCLE_COPY[lifecycleAction].confirm}
          destructive={lifecycleAction === 'reject'}
          busy={busy}
          onConfirm={submitLifecycle}
        >
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </ActionDialog>
      )}

      <ActionDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        title="Create manual quote"
        description="Enter only the active server rate-card ID. The Bridge owns the amount, currency, and immutable pricing snapshot."
        confirmLabel="Create quote"
        busy={busy}
        onConfirm={submitQuote}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="manual-quote-rate-card">Server rate-card ID</Label>
          <Input
            id="manual-quote-rate-card"
            required
            maxLength={40}
            autoComplete="off"
            value={rateCardId}
            onChange={(event) => setRateCardId(event.target.value)}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      </ActionDialog>

      <ActionDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        title="Initiate refund"
        description="Leave the amount blank for the full remaining amount. The UI will show refund pending only after the Bridge accepts the request; refunded totals remain webhook-owned."
        confirmLabel="Initiate refund"
        busy={busy}
        onConfirm={submitRefund}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="refund-amount">Amount in minor units (optional)</Label>
          <Input
            id="refund-amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={refundableRemainderMinor}
            step={1}
            placeholder={`Up to ${refundableRemainderMinor}`}
            value={refundAmount}
            onChange={(event) => setRefundAmount(event.target.value)}
          />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </div>
      </ActionDialog>

      <DeliverableDialog
        campaignId={campaign.id}
        deliverable={selectedDeliverable}
        open={deliverableOpen}
        onOpenChange={setDeliverableOpen}
        onSaved={async (message) => {
          setAnnouncement(message);
          await load(true);
        }}
      />

      <ActionDialog
        open={removingDeliverable !== null}
        onOpenChange={(open) => !open && setRemovingDeliverable(null)}
        title="Remove deliverable"
        description="The deliverable will be retained as removed audit history and excluded from active fulfillment checks."
        confirmLabel="Remove deliverable"
        destructive
        busy={busy}
        onConfirm={removeDeliverable}
      >
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </ActionDialog>

      <ActionDialog
        open={resolvingException !== null}
        onOpenChange={(open) => !open && setResolvingException(null)}
        title="Verify exception resolution"
        description="The Bridge will re-check persisted payment and campaign truth. An active mismatch will remain open."
        confirmLabel="Verify and resolve"
        busy={busy}
        onConfirm={resolveException}
      >
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </ActionDialog>
    </div>
  );
}
