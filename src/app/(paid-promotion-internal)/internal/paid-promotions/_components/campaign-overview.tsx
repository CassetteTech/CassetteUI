import { ArtworkImage } from '@/components/ui/artwork-image';
import { Field, Panel, StatusPill } from '@/app/(sidebar)/internal/_components/kit';
import type { InternalPaidPromotionCampaignDetail } from '@/types';
import { formatDate, formatMoney, formatState, statusTone } from './paid-promotion-utils';

export function CampaignOverview({ campaign }: { campaign: InternalPaidPromotionCampaignDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Canonical track" bodyClassName="p-4">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border">
            <ArtworkImage
              src={campaign.track.coverArtUrl}
              alt={`Artwork for ${campaign.track.title}`}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{campaign.track.title}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {campaign.track.artists.length > 0 ? campaign.track.artists.join(', ') : 'Unknown artist'}
            </p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              {campaign.track.id} · {formatState(campaign.sourcePlatform)}
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Lifecycle" bodyClassName="divide-y divide-border px-4 py-2">
        <Field label="Campaign">
          <StatusPill tone={statusTone(campaign.status)} label={formatState(campaign.status)} />
        </Field>
        <Field label="Changed">{formatDate(campaign.statusChangedAtUtc)}</Field>
        <Field label="Requested window">
          {campaign.requestedWindowStart || campaign.requestedWindowEnd
            ? `${campaign.requestedWindowStart ?? 'Open'} – ${campaign.requestedWindowEnd ?? 'Open'}`
            : 'Not requested'}
        </Field>
        <Field label="Created">{formatDate(campaign.createdAtUtc)}</Field>
        <Field label="Updated">{formatDate(campaign.updatedAtUtc)}</Field>
      </Panel>

      <Panel title="Quote" bodyClassName="divide-y divide-border px-4 py-2">
        <Field label="Pricing mode">{formatState(campaign.pricingMode)}</Field>
        <Field label="Current quote">{formatMoney(campaign.amountMinor, campaign.currency)}</Field>
        <Field label="Rate source">{campaign.rateCardId ?? 'Immutable snapshot'}</Field>
        <Field label="Audit snapshots">{campaign.pricingSnapshots.length}</Field>
      </Panel>

      <Panel title="Payment" bodyClassName="divide-y divide-border px-4 py-2">
        {campaign.payment ? (
          <>
            <Field label="Status">
              <StatusPill
                tone={statusTone(campaign.payment.status)}
                label={formatState(campaign.payment.status)}
              />
            </Field>
            <Field label="Paid amount">
              {formatMoney(campaign.payment.amountMinor, campaign.payment.currency)}
            </Field>
            <Field label="Refunded by webhook">
              {formatMoney(campaign.payment.amountRefundedMinor, campaign.payment.currency)}
            </Field>
            <Field label="Paid at">{formatDate(campaign.payment.paidAtUtc)}</Field>
            <Field label="Updated">{formatDate(campaign.payment.updatedAtUtc)}</Field>
            {campaign.payment.status === 'refund_pending' && (
              <p className="py-2 text-xs text-[hsl(var(--warning-text))]">
                Refund initiation is pending. Refunded totals and closure remain webhook-owned.
              </p>
            )}
          </>
        ) : (
          <p className="py-3 text-sm text-muted-foreground">No payment record.</p>
        )}
      </Panel>

      <Panel title="Attestation" bodyClassName="divide-y divide-border px-4 py-2">
        <Field label="Relationship">
          {campaign.attestedRelationship ? formatState(campaign.attestedRelationship) : 'Missing'}
        </Field>
        <Field label="Version">{campaign.attestationVersion ?? 'Missing'}</Field>
        <Field label="Attested">{formatDate(campaign.attestedAtUtc)}</Field>
      </Panel>

      <Panel title="Brief" bodyClassName="p-4">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
          {campaign.brief || 'No brief supplied.'}
        </p>
      </Panel>

      {campaign.pricingSnapshots.length > 0 && (
        <Panel title="Pricing audit" bodyClassName="divide-y divide-border xl:col-span-2">
          {campaign.pricingSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="grid gap-1 px-4 py-3 text-xs sm:grid-cols-3 sm:items-center">
              <span className="font-mono text-muted-foreground">{snapshot.id}</span>
              <span>{formatMoney(snapshot.amountMinor, snapshot.currency)}</span>
              <span className="sm:text-right text-muted-foreground">
                {snapshot.sourceRateCardId} · {formatDate(snapshot.createdAtUtc)}
              </span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
