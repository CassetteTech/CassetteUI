'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Music2, RefreshCw } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/artwork-image';
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
import { EmptyState } from '@/app/(sidebar)/internal/_components/empty-state';
import { Panel, SectionHeader, StatusPill } from '@/app/(sidebar)/internal/_components/kit';
import {
  PAID_PROMOTION_CAMPAIGN_STATUSES,
} from '@/services/internal-paid-promotions';
import { paidPromotionSubjectsService } from '@/services/paid-promotion-subjects';
import type { PaidPromotionSubject } from '@/types';
import { errorMessage, formatDate, formatState, statusTone } from './paid-promotion-utils';

function statusCounts(subject: PaidPromotionSubject) {
  return PAID_PROMOTION_CAMPAIGN_STATUSES.flatMap((status) => {
    const count = subject.campaignStatusCounts[status];
    return count === undefined ? [] : [{ status, count }];
  });
}

function SubjectIdentity({ subject, compact = false }: {
  subject: PaidPromotionSubject;
  compact?: boolean;
}) {
  const sizeClassName = compact ? 'h-12 w-12' : 'h-14 w-14';

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className={`relative shrink-0 overflow-hidden rounded-md border border-border ${sizeClassName}`}>
        <ArtworkImage
          src={subject.coverArtUrl}
          alt={`Artwork for ${subject.trackTitle}`}
          fill
          sizes={compact ? '48px' : '56px'}
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{subject.trackTitle}</p>
        <p className="truncate text-xs text-muted-foreground">
          {subject.artists.length > 0 ? subject.artists.join(', ') : 'Unknown artist'}
        </p>
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
          {subject.trackId}
        </p>
      </div>
    </div>
  );
}

function StatusRollup({ subject }: { subject: PaidPromotionSubject }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {statusCounts(subject).map(({ status, count }) => (
        <StatusPill
          key={status}
          tone={statusTone(status)}
          label={`${formatState(status)} · ${count.toLocaleString()}`}
        />
      ))}
    </div>
  );
}

export function PaidPromotionSubjects() {
  const [subjects, setSubjects] = useState<PaidPromotionSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const nextSubjects = await paidPromotionSubjectsService.listInternal();
      if (currentRequest !== requestId.current) return;
      setSubjects(nextSubjects);
      setAnnouncement(
        `${nextSubjects.length.toLocaleString()} paid-promotion ${nextSubjects.length === 1 ? 'subject' : 'subjects'} loaded.`,
      );
    } catch (nextError) {
      if (currentRequest !== requestId.current) return;
      setSubjects([]);
      setAnnouncement('Paid-promotion subjects could not be loaded.');
      setError(errorMessage(nextError));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <SectionHeader
        section="Paid Promotions"
        title="Subjects"
        count={loading || error ? undefined : subjects.length}
        actions={(
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/internal/paid-promotions">
                <ArrowLeft aria-hidden="true" /> Campaign queue
              </Link>
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
              <RefreshCw aria-hidden="true" /> Refresh
            </Button>
          </>
        )}
      />

      <output className="sr-only" aria-live="polite">
        {announcement}
      </output>

      <Panel title="Canonical tracks" className="overflow-hidden" bodyClassName="min-h-28">
        {loading ? (
          <output className="block p-6 text-sm text-muted-foreground">
            Loading paid-promotion subjects…
          </output>
        ) : error ? (
          <div role="alert" className="m-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Paid-promotion subjects could not be shown.</p>
            <p className="mt-1 break-words">{error}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : subjects.length === 0 ? (
          <EmptyState
            icon={Music2}
            title="No promoted subjects"
            description="No canonical tracks have a paid-promotion campaign yet."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableCaption className="sr-only">Paid-promotion canonical subject catalog</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canonical track</TableHead>
                    <TableHead>Campaigns</TableHead>
                    <TableHead>Status rollup</TableHead>
                    <TableHead>First campaign</TableHead>
                    <TableHead className="text-right">Latest campaign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.trackId}>
                      <TableCell className="max-w-80 whitespace-normal">
                        <SubjectIdentity subject={subject} />
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {subject.campaignCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-96 whitespace-normal">
                        <StatusRollup subject={subject} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(subject.firstCampaignAtUtc)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatDate(subject.latestCampaignAtUtc)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-border md:hidden" aria-label="Paid-promotion canonical subject catalog">
              {subjects.map((subject) => (
                <li key={subject.trackId} className="space-y-3 p-3">
                  <SubjectIdentity subject={subject} compact />
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Campaigns</dt>
                      <dd className="font-mono tabular-nums">{subject.campaignCount.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">First campaign</dt>
                      <dd>{formatDate(subject.firstCampaignAtUtc)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Latest campaign</dt>
                      <dd>{formatDate(subject.latestCampaignAtUtc)}</dd>
                    </div>
                  </dl>
                  <div aria-label={`Campaign status rollup for ${subject.trackTitle}`}>
                    <StatusRollup subject={subject} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
