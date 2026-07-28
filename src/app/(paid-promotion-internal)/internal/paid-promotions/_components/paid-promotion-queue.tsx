'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Panel,
  SectionHeader,
  StatusPill,
} from '@/app/(sidebar)/internal/_components/kit';
import { getPaidPromotionElementTypeLabel } from '@/services/paid-promotion-status-presentation';
import {
  internalPaidPromotionsService,
  PAID_PROMOTION_CAMPAIGN_STATUSES,
  PAID_PROMOTION_PAYMENT_STATUSES,
} from '@/services/internal-paid-promotions';
import { ArtworkImage } from '@/components/ui/artwork-image';
import type {
  InternalPaidPromotionCampaignSummary,
  InternalPaidPromotionCustomer,
  InternalPaidPromotionException,
} from '@/types';
import { ActionDialog } from './action-dialog';
import { errorMessage, formatDate, formatMoney, formatState, statusTone } from './paid-promotion-utils';

type ExceptionFilter = 'all' | 'open' | 'none';

/**
 * Who booked the campaign. A deleted account still has campaigns and payments,
 * so this states that plainly rather than rendering an empty cell that reads
 * like a loading bug.
 */
function CustomerCell({ customer }: { customer: InternalPaidPromotionCustomer | null }) {
  if (!customer) {
    return <span className="text-xs italic text-muted-foreground">Account deleted</span>;
  }

  return (
    <div className="min-w-0">
      <Link
        href={`/profile/${encodeURIComponent(customer.username)}`}
        className="block truncate rounded-sm text-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {customer.displayName?.trim() || customer.username}
      </Link>
      <a
        href={`mailto:${customer.email}`}
        className="block truncate rounded-sm font-mono text-[10px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {customer.email}
      </a>
    </div>
  );
}

const selectClassName =
  'h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';
const RESOLVABLE_EXCEPTION_KINDS = new Set([
  'dispute_opened',
  'orphan_session',
  'stuck_pending',
]);

export function PaidPromotionQueue() {
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [exceptionFilter, setExceptionFilter] = useState<ExceptionFilter>('all');
  const [campaigns, setCampaigns] = useState<InternalPaidPromotionCampaignSummary[]>([]);
  const [exceptions, setExceptions] = useState<InternalPaidPromotionException[]>([]);
  const [selectedException, setSelectedException] = useState<InternalPaidPromotionException | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const [nextCampaigns, nextExceptions] = await Promise.all([
        internalPaidPromotionsService.listCampaigns({
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          hasOpenExceptions:
            exceptionFilter === 'all' ? undefined : exceptionFilter === 'open',
        }),
        internalPaidPromotionsService.listExceptions({ status: 'open' }),
      ]);
      if (currentRequest !== requestId.current) return;
      setCampaigns(nextCampaigns);
      setExceptions(nextExceptions);
    } catch (nextError) {
      if (currentRequest !== requestId.current) return;
      setCampaigns([]);
      setExceptions([]);
      setError(errorMessage(nextError));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [exceptionFilter, paymentStatus, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const resolveException = async () => {
    if (!selectedException) return;
    setResolving(true);
    setError(null);
    try {
      const serverException = await internalPaidPromotionsService.getException(selectedException.id);
      if (serverException.status !== 'open') {
        throw new Error('This exception is no longer open. Refresh the queue before acting.');
      }
      const resolved = await internalPaidPromotionsService.resolveException(serverException.id);
      if (resolved.status !== 'resolved') {
        throw new Error('The server did not verify this exception as resolved.');
      }
      setSelectedException(null);
      setAnnouncement('Exception verified and resolved.');
      await load();
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <SectionHeader
        section="Product & Growth"
        title="Paid Promotions"
        count={loading ? undefined : campaigns.length}
        actions={(
          <>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </Button>
          </>
        )}
      />

      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>

      <Panel title="Campaign queue" bodyClassName="p-3">
        <fieldset className="grid gap-3 sm:grid-cols-3" disabled={loading}>
          <legend className="sr-only">Filter the campaign queue</legend>
          <label className="grid gap-1 text-xs font-medium text-foreground">
            Campaign status
            <select
              aria-label="Campaign status"
              className={selectClassName}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All campaign statuses</option>
              {PAID_PROMOTION_CAMPAIGN_STATUSES.map((value) => (
                <option key={value} value={value}>{formatState(value)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-foreground">
            Payment status
            <select
              aria-label="Payment status"
              className={selectClassName}
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
            >
              <option value="">All payment statuses</option>
              {PAID_PROMOTION_PAYMENT_STATUSES.map((value) => (
                <option key={value} value={value}>{formatState(value)}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-foreground">
            Exceptions
            <select
              aria-label="Exception status"
              className={selectClassName}
              value={exceptionFilter}
              onChange={(event) => setExceptionFilter(event.target.value as ExceptionFilter)}
            >
              <option value="all">All campaigns</option>
              <option value="open">Has open exceptions</option>
              <option value="none">No open exceptions</option>
            </select>
          </label>
        </fieldset>
      </Panel>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Paid-promotion data could not be shown.</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      <Panel title="Campaigns" bodyClassName="min-h-24" className="overflow-hidden">
        {loading ? (
          <output className="block p-6 text-sm text-muted-foreground">Loading campaign queue…</output>
        ) : campaigns.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No campaigns match these filters.</p>
        ) : (
          <>
            <div className="hidden sm:block">
              <Table>
                <TableCaption className="sr-only">Paid-promotion campaign queue</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Requested by</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="max-w-72 whitespace-normal">
                        <div className="flex items-start gap-3">
                          <div className="relative size-10 shrink-0 overflow-hidden rounded border border-border">
                            <ArtworkImage
                              src={campaign.coverArtUrl}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/internal/paid-promotions/${encodeURIComponent(campaign.id)}`}
                              className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {campaign.title}
                            </Link>
                            <span className="block font-mono text-[10px] text-muted-foreground">
                              {getPaidPromotionElementTypeLabel(campaign.elementType)} ·{' '}
                              {formatState(campaign.sourcePlatform)} ·{' '}
                              {/* The id stays its own link: ops navigate by id
                                  from incident notes and exception rows. */}
                              <Link
                                href={`/internal/paid-promotions/${encodeURIComponent(campaign.id)}`}
                                className="rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {campaign.id}
                              </Link>
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-56 whitespace-normal">
                        <CustomerCell customer={campaign.customer} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(campaign.amountMinor, campaign.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill tone={statusTone(campaign.status)} label={formatState(campaign.status)} />
                          {/* A bare count reads as data; ops need the row to
                              announce that it needs attention. */}
                          {campaign.openExceptionCount > 0 && (
                            <StatusPill
                              tone="warning"
                              label={`${campaign.openExceptionCount} open`}
                            />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {campaign.paymentStatus ? (
                          <StatusPill
                            tone={statusTone(campaign.paymentStatus)}
                            label={formatState(campaign.paymentStatus)}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(campaign.updatedAtUtc)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-border sm:hidden" aria-label="Paid-promotion campaign queue">
              {campaigns.map((campaign) => (
                <li key={campaign.id} className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded border border-border">
                        <ArtworkImage
                          src={campaign.coverArtUrl}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{campaign.title}</p>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {getPaidPromotionElementTypeLabel(campaign.elementType)} · {campaign.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusPill tone={statusTone(campaign.status)} label={formatState(campaign.status)} />
                      {campaign.openExceptionCount > 0 && (
                        <StatusPill tone="warning" label={`${campaign.openExceptionCount} open`} />
                      )}
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Requested by</dt>
                      <dd><CustomerCell customer={campaign.customer} /></dd>
                    </div>
                    <div><dt className="text-muted-foreground">Quote</dt><dd>{formatMoney(campaign.amountMinor, campaign.currency)}</dd></div>
                    <div><dt className="text-muted-foreground">Payment</dt><dd>{campaign.paymentStatus ? formatState(campaign.paymentStatus) : 'None'}</dd></div>
                    <div><dt className="text-muted-foreground">Updated</dt><dd>{formatDate(campaign.updatedAtUtc)}</dd></div>
                  </dl>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/internal/paid-promotions/${encodeURIComponent(campaign.id)}`}>
                      Review campaign
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel
        title="Open exceptions"
        bodyClassName="min-h-20"
        actions={exceptions.length > 0 ? (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{exceptions.length}</span>
        ) : undefined}
      >
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading exceptions…</p>
        ) : exceptions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No open paid-promotion exceptions.</p>
        ) : (
          <ul className="divide-y divide-border" aria-label="Open paid-promotion exceptions">
            {exceptions.map((exception) => (
              <li key={exception.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning-text))]" aria-hidden="true" />
                  <div className="min-w-0 text-xs">
                    <p className="font-medium text-foreground">{formatState(exception.kind)}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {exception.id} · {formatDate(exception.createdAtUtc)}
                    </p>
                    {exception.campaignId && (
                      <Link
                        className="mt-1 inline-flex rounded-sm text-domain underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={`/internal/paid-promotions/${encodeURIComponent(exception.campaignId)}`}
                      >
                        Open campaign {exception.campaignId}
                      </Link>
                    )}
                  </div>
                </div>
                {RESOLVABLE_EXCEPTION_KINDS.has(exception.kind) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setSelectedException(exception);
                    }}
                  >
                    Verify resolution
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ActionDialog
        open={selectedException !== null}
        onOpenChange={(open) => !open && setSelectedException(null)}
        title="Verify exception resolution"
        description="The Bridge will re-check persisted payment and campaign truth. An active mismatch will remain open."
        confirmLabel="Verify and resolve"
        busy={resolving}
        onConfirm={() => void resolveException()}
      >
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </ActionDialog>
    </div>
  );
}
