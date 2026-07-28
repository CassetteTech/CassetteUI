import Link from 'next/link';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { Panel } from '@/app/(sidebar)/internal/_components/kit';
import { getPaidPromotionElementTypeLabel } from '@/services/paid-promotion-status-presentation';
import type { InternalPaidPromotionCampaignDetail } from '@/types';
import { formatMoney, formatState } from './paid-promotion-utils';

/**
 * The top of a campaign answers the questions an operator opens the page with:
 * what am I promoting, who asked for it, what did they pay, how much of the
 * commitment is delivered, and what did they say they wanted. Everything that
 * is a record rather than a decision input — lifecycle timestamps, the quote
 * breakdown, payment internals, attestation, pricing audit — lives at the
 * bottom of the page instead.
 */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-base font-semibold text-foreground">{value}</p>
      {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function CampaignSummary({ campaign }: { campaign: InternalPaidPromotionCampaignDetail }) {
  const { customer, payment } = campaign;

  // What the customer was actually charged is the provider-confirmed total;
  // the quote is only a fallback label before payment settles.
  const chargedLabel = payment?.finalTotalMinor != null
    ? formatMoney(payment.finalTotalMinor, payment.currency)
    : formatMoney(campaign.amountMinor, campaign.currency);
  const chargedHint = payment?.finalTotalMinor != null
    ? 'Provider-confirmed total'
    : 'Quote — not yet confirmed by the provider';

  const termLabel = campaign.weeks === null
    ? 'Not priced yet'
    : `${campaign.weeks} ${campaign.weeks === 1 ? 'week' : 'weeks'}`;
  const termHint = campaign.weeklyDeliverableMinimum
    ? `At least ${campaign.weeklyDeliverableMinimum} placement${
      campaign.weeklyDeliverableMinimum === 1 ? '' : 's'
    } per week`
    : undefined;

  const deliveredLabel = campaign.weeks === null || campaign.weeksDelivered === null
    ? 'Not tracked yet'
    : `${campaign.weeksDelivered} of ${campaign.weeks}`;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Panel title="Campaign" bodyClassName="space-y-5 p-4">
        <div className="flex items-start gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border">
            <ArtworkImage
              src={campaign.subject.coverArtUrl}
              alt={`Artwork for ${campaign.subject.title}`}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {getPaidPromotionElementTypeLabel(campaign.subject.elementType)} ·{' '}
              {formatState(campaign.sourcePlatform)}
            </p>
            <h2 className="truncate text-lg font-semibold text-foreground">
              {campaign.subject.title}
            </h2>
            {campaign.subject.subtitleNames.length > 0 && (
              <p className="truncate text-sm text-muted-foreground">
                {campaign.subject.subtitleNames.join(', ')}
              </p>
            )}
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              {campaign.subject.id}
            </p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <Stat label="Charged" value={chargedLabel} hint={chargedHint} />
          <Stat label="Run length" value={termLabel} hint={termHint} />
          <Stat label="Weeks delivered" value={deliveredLabel} />
        </div>

        <div className="border-t border-border pt-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Brief
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {campaign.brief || 'No brief supplied.'}
          </p>
        </div>
      </Panel>

      <Panel title="Requested by" bodyClassName="p-4">
        {customer ? (
          <div className="space-y-3">
            <div className="min-w-0">
              <Link
                href={`/profile/${encodeURIComponent(customer.username)}`}
                className="block truncate rounded-sm text-base font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {customer.displayName?.trim() || customer.username}
              </Link>
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                @{customer.username}
              </p>
            </div>

            <a
              href={`mailto:${customer.email}`}
              className="block truncate rounded-sm text-sm text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {customer.email}
            </a>

            <dl className="space-y-2 border-t border-border pt-3 text-sm">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Acting as
                </dt>
                <dd className="text-foreground">
                  {customer.promoterKind ? formatState(customer.promoterKind) : 'Not declared'}
                  {campaign.attestedRelationship && (
                    <span className="block text-xs text-muted-foreground">
                      Attested: {formatState(campaign.attestedRelationship)}
                    </span>
                  )}
                </dd>
              </div>
              {customer.orgName && (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Organization
                  </dt>
                  <dd className="break-words text-foreground">{customer.orgName}</dd>
                </div>
              )}
              {customer.website && (
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Website
                  </dt>
                  <dd className="break-all">
                    <a
                      href={customer.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="rounded-sm text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {customer.website}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This account has been deleted. The campaign and its financial record are retained.
          </p>
        )}
      </Panel>
    </div>
  );
}
