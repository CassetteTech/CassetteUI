'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BriefcaseBusiness } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { apiService } from '@/services/api';
import type {
  InternalConversionJobOperationsItem,
  InternalConversionJobsOperationsResponse,
  InternalLambdaHealthOperationsResponse,
  InternalLambdaHealthPlatform,
  InternalOperationalAlertsResponse,
} from '@/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PAGE_SIZE, formatDate, formatDuration, statusTone } from './internal-utils';
import {
  CopyId,
  DataTable,
  ErrorBanner,
  Field,
  IdField,
  Pagination,
  Panel,
  RefreshButton,
  SegmentedControl,
  StatusPill,
  Toolbar,
  type Column,
  type Tone,
} from './kit';

type JobStatusFilter = 'all' | 'processing' | 'ready' | 'failed';

const JOB_STATUS_OPTIONS: ReadonlyArray<{ value: JobStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'processing', label: 'Processing' },
  { value: 'ready', label: 'Ready' },
  { value: 'failed', label: 'Failed' },
];

function signalTone(severity: string): Tone {
  return severity === 'error' || severity === 'critical' ? 'critical' : 'warning';
}

const SIGNAL_RULE: Record<'critical' | 'warning', string> = {
  critical: 'border-destructive',
  warning: 'border-[hsl(var(--warning))]',
};

const TONE_TEXT: Record<Tone, string> = {
  critical: 'text-destructive',
  warning: 'text-[hsl(var(--warning-text))]',
  success: 'text-[hsl(var(--success-text))]',
  info: 'text-[hsl(var(--info-text))]',
  neutral: 'text-muted-foreground',
  domain: 'text-domain',
};

/* Time-of-day only — the masthead subline and telemetry rail quote times often
   enough that full locale datetimes turn into noise. */
function timeOnly(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString();
}

/* A platform with zero warmups and no last-warmup timestamp hasn't reported
   at all in the window. That is "no telemetry", not "unhealthy" — the two
   states are counted and rendered separately on purpose. */
function hasTelemetry(platform: InternalLambdaHealthPlatform): boolean {
  return platform.recentWarmupCount > 0 || Boolean(platform.lastWarmupAtUtc);
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 font-mono text-[11px] text-foreground focus:border-domain focus:outline-none focus:ring-1 focus:ring-domain"
      />
    </label>
  );
}

/* Writes the selected job into the query string so the view is deep-linkable
   (`/internal/sentinel?view=runtime&job=<id>`), without a navigation. */
function writeJobParam(jobId: string | null) {
  const url = new URL(window.location.href);
  if (jobId) {
    url.searchParams.set('job', jobId);
  } else {
    url.searchParams.delete('job');
  }
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export function SentinelRuntimePanel() {
  const searchParams = useSearchParams();
  const requestedJobId = searchParams.get('job') ?? '';

  const [health, setHealth] = useState<InternalLambdaHealthOperationsResponse | null>(null);
  const [alerts, setAlerts] = useState<InternalOperationalAlertsResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [search, setSearch] = useState(requestedJobId);
  const [status, setStatus] = useState<JobStatusFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<InternalConversionJobsOperationsResponse | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<InternalConversionJobOperationsItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDeepLinkJobId, setPendingDeepLinkJobId] = useState<string | null>(requestedJobId || null);
  const debouncedSearch = useDebounce(search, 300);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const [healthResponse, alertsResponse] = await Promise.all([
        apiService.getInternalLambdaHealth(),
        apiService.getInternalOperationalAlerts(),
      ]);
      setHealth(healthResponse);
      setAlerts(alertsResponse);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'Failed to load runtime summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobsError(null);
    try {
      const response = await apiService.getInternalConversionJobs({
        q: debouncedSearch || undefined,
        status: status === 'all' ? undefined : status,
        fromDate: fromDate ? `${fromDate}T00:00:00.000Z` : undefined,
        toDate: toDate ? `${toDate}T23:59:59.999Z` : undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setJobs(response);
      // Keep the sheet's data fresh if the selected job is in the new page.
      setSelectedJob((current) =>
        current ? response.items.find((job) => job.jobId === current.jobId) ?? current : null
      );
    } catch (error) {
      setJobsError(error instanceof Error ? error.message : 'Failed to load conversion jobs');
    } finally {
      setJobsLoading(false);
    }
  }, [debouncedSearch, status, fromDate, toDate, page]);

  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => { void loadJobs(); }, [loadJobs]);

  /* Deep link: `?job=<id>` seeds the search box, and once results land the
     matching job opens in the sheet. One shot — after the first result set the
     param only tracks in-page selection. */
  useEffect(() => {
    if (!pendingDeepLinkJobId || !jobs) return;
    const match = jobs.items.find((job) => job.jobId === pendingDeepLinkJobId);
    if (match) {
      setSelectedJob(match);
      setSheetOpen(true);
    }
    setPendingDeepLinkJobId(null);
  }, [jobs, pendingDeepLinkJobId]);

  const selectJob = (job: InternalConversionJobOperationsItem) => {
    setSelectedJob(job);
    setSheetOpen(true);
    writeJobParam(job.jobId);
  };

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) writeJobParam(null);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeStatus = (value: JobStatusFilter) => {
    setStatus(value);
    setPage(1);
  };

  const activeSignals = alerts?.items.filter((alert) => alert.status === 'active') ?? [];
  const platforms = health?.platforms ?? [];
  const noTelemetryCount = platforms.filter((platform) => !hasTelemetry(platform)).length;
  const unhealthyCount = platforms.filter(
    (platform) => hasTelemetry(platform) && platform.status !== 'healthy'
  ).length;

  /* Masthead: the view's one loud element. Signals outrank platform health;
     everything healthy earns the nominal line. */
  const signalCount = activeSignals.length;
  const hasCriticalSignal = activeSignals.some(
    (alert) => alert.severity === 'error' || alert.severity === 'critical'
  );
  const summaryPending = summaryLoading && !health && !alerts;
  const mastheadTone: Tone = summaryError
    ? 'critical'
    : signalCount
      ? hasCriticalSignal ? 'critical' : 'warning'
      : unhealthyCount
        ? 'warning'
        : 'success';
  const statusWord = summaryError
    ? 'Telemetry unavailable'
    : signalCount
      ? `${signalCount} active signal${signalCount === 1 ? '' : 's'}`
      : unhealthyCount
        ? `${unhealthyCount} platform${unhealthyCount === 1 ? '' : 's'} degraded`
        : 'All systems nominal';

  const sublineParts: string[] = [];
  if (alerts) {
    sublineParts.push(`${alerts.items.length} rules`, `${alerts.windowMinutes}m window`);
  }
  if (health) {
    sublineParts.push(
      `${platforms.length - unhealthyCount - noTelemetryCount}/${platforms.length} platforms nominal`
    );
    if (noTelemetryCount) sublineParts.push(`${noTelemetryCount} no telemetry`);
  }

  const columns: Column<InternalConversionJobOperationsItem>[] = [
    {
      key: 'job',
      header: 'Job',
      valign: 'top',
      cell: (job) => (
        <div className="min-w-0 space-y-0.5">
          <p className="max-w-[260px] truncate font-mono text-[11px] font-medium tabular-nums text-foreground">
            {job.jobId}
          </p>
          <p className="truncate text-[10px] text-muted-foreground">
            {job.sourceDomain ?? job.sourcePlatform ?? 'Unknown source'}
            {job.elementType ? ` · ${job.elementType}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      valign: 'top',
      cell: (job) => (
        <div className="space-y-0.5">
          <StatusPill tone={statusTone(job.status)} label={job.status} />
          {job.stage && <p className="font-mono text-[10px] text-muted-foreground">{job.stage}</p>}
        </div>
      ),
    },
    {
      key: 'failure',
      header: 'Failure',
      className: 'hidden xl:table-cell',
      valign: 'top',
      cell: (job) =>
        job.errorCategory ? (
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-destructive">
            {job.errorCategory}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'duration',
      header: 'Duration',
      align: 'right',
      className: 'hidden lg:table-cell',
      valign: 'top',
      cell: (job) => (
        <span className="text-xs text-muted-foreground">{formatDuration(job.durationMs) ?? '—'}</span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      align: 'right',
      valign: 'top',
      cell: (job) => <span className="text-xs text-muted-foreground">{formatDate(job.createdAtUtc)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Masthead: one loud status readout; everything else whispers. ── */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-1">
        {summaryPending ? (
          <div className="space-y-2">
            <div className="h-9 w-72 animate-pulse rounded bg-muted" />
            <div className="h-3 w-52 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className={cn('flex items-center gap-3', TONE_TEXT[mastheadTone])}>
              <span
                className={cn('signal-dot', mastheadTone !== 'success' && 'signal-dot-pulse')}
                aria-hidden
              />
              <h2 className="font-teko text-4xl uppercase leading-none tracking-wide">
                {statusWord}
              </h2>
            </div>
            {sublineParts.length > 0 && (
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {sublineParts.join(' · ')}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          {health && (
            <span className="font-mono text-[10px] text-muted-foreground">
              generated {timeOnly(health.generatedAtUtc)}
            </span>
          )}
          <RefreshButton loading={summaryLoading} onClick={() => void loadSummary()} />
        </div>
      </div>

      {summaryError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>{summaryError}</span>
          <button type="button" className="underline underline-offset-2" onClick={() => void loadSummary()}>
            Retry
          </button>
        </div>
      )}

      {/* Signals are exceptional, so they only occupy space when active —
          left-rule rows under the masthead, no permanent empty panel. */}
      {activeSignals.length > 0 && (
        <div className="space-y-3">
          {activeSignals.map((alert) => {
            const tone = signalTone(alert.severity);
            return (
              <div
                key={alert.ruleId}
                className={cn('space-y-0.5 border-l-2 py-0.5 pl-3', SIGNAL_RULE[tone === 'critical' ? 'critical' : 'warning'])}
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xs font-medium text-foreground">{alert.name}</span>
                  <StatusPill tone={tone} label={alert.severity} dot={false} />
                </div>
                <p className="text-[11px] text-muted-foreground">{alert.message}</p>
                <p className="font-mono text-[10px] text-muted-foreground/70">
                  {alert.ruleId} · {alert.dataSource}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Platform telemetry rail: one hero number per platform. ── */}
      <div className="grid divide-y divide-border overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {summaryPending ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-2 px-4 py-3">
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-7 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))
        ) : platforms.length ? (
          platforms.map((platform) => {
            const telemetry = hasTelemetry(platform);
            const tone = statusTone(platform.status);
            return (
              <div key={platform.platform} className="space-y-1.5 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {platform.platform}
                  </span>
                  {telemetry ? (
                    <StatusPill tone={tone} label={platform.status} />
                  ) : (
                    <StatusPill tone="neutral" label="No telemetry" />
                  )}
                </div>
                <p
                  className={cn(
                    'text-2xl font-semibold tabular-nums leading-none',
                    !telemetry
                      ? 'text-muted-foreground/50'
                      : platform.status === 'healthy'
                        ? 'text-foreground'
                        : TONE_TEXT[tone]
                  )}
                >
                  {telemetry ? formatDuration(platform.recentLatencyP95Ms) ?? '—' : '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">p95 warm latency</p>
                {telemetry ? (
                  <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    p50 {formatDuration(platform.recentLatencyP50Ms) ?? '—'} ·{' '}
                    {platform.recentWarmupCount} warmup{platform.recentWarmupCount === 1 ? '' : 's'} ·{' '}
                    {(platform.recentFailureRate * 100).toFixed(0)}% failed ·{' '}
                    last {timeOnly(platform.lastWarmupAtUtc)}
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">No warmup telemetry in this window.</p>
                )}
                {telemetry && platform.status !== 'healthy' && platform.mostRecentErrorCategory && (
                  <p className="font-mono text-[10px] text-destructive">{platform.mostRecentErrorCategory}</p>
                )}
              </div>
            );
          })
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground sm:col-span-3">
            No lambda health data.
          </div>
        )}
      </div>

      <Panel
        title={jobs?.totalItems ? `Conversion jobs · ${jobs.totalItems}` : 'Conversion jobs'}
        actions={<RefreshButton loading={jobsLoading} onClick={() => void loadJobs()} />}
      >
        <div className="border-b border-border px-3 py-2">
          <Toolbar
            search={search}
            onSearchChange={changeSearch}
            searchPlaceholder="Search job, correlation, stage, post, error…"
            filters={
              <>
                <SegmentedControl<JobStatusFilter> value={status} onChange={changeStatus} options={JOB_STATUS_OPTIONS} />
                <DateFilter label="From" value={fromDate} onChange={(value) => { setFromDate(value); setPage(1); }} />
                <DateFilter label="To" value={toDate} onChange={(value) => { setToDate(value); setPage(1); }} />
              </>
            }
          />
        </div>

        {jobsError && <ErrorBanner message={jobsError} onRetry={() => void loadJobs()} />}

        <DataTable<InternalConversionJobOperationsItem>
          columns={columns}
          rows={jobs?.items ?? []}
          rowKey={(job) => job.jobId}
          onRowClick={selectJob}
          selectedKey={sheetOpen ? selectedJob?.jobId ?? null : null}
          isLoading={jobsLoading && !jobs?.items.length}
          empty={{
            icon: BriefcaseBusiness,
            title: 'No conversion jobs',
            description: 'No jobs match these filters.',
          }}
          renderMobile={(job) => (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <StatusPill tone={statusTone(job.status)} label={job.status} />
                <span className="text-[10px] text-muted-foreground">{formatDate(job.createdAtUtc)}</span>
              </div>
              <p className="truncate font-mono text-[11px] font-medium tabular-nums text-foreground">{job.jobId}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {job.sourceDomain ?? job.stage ?? 'Unknown source'}
                {job.errorCategory ? ` · ${job.errorCategory}` : ''}
              </p>
            </div>
          )}
        />

        <Pagination
          page={jobs?.page ?? page}
          totalPages={jobs?.totalPages ?? 1}
          totalItems={jobs?.totalItems ?? 0}
          itemLabel="jobs"
          isLoading={jobsLoading}
          onPageChange={setPage}
        />
      </Panel>

      <ConversionJobSheet job={selectedJob} open={sheetOpen} onOpenChange={handleSheetOpenChange} />
    </div>
  );
}

/* ─────────────────────── Conversion job sheet ──────────────────────────────
   Slide-in detail for a single conversion job: identity, failure, timing,
   source/target context, lambda invocations, and linked issue reports. */
function ConversionJobSheet({
  job,
  open,
  onOpenChange,
}: {
  job: InternalConversionJobOperationsItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const canonicalIds: Array<[string, string]> = job
    ? ([
        ['Track', job.canonicalTrackId],
        ['Album', job.canonicalAlbumId],
        ['Artist', job.canonicalArtistId],
        ['Playlist', job.canonicalPlaylistId],
      ].filter(([, value]) => Boolean(value)) as Array<[string, string]>)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="domain-eng flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {job && (
          <>
            <SheetHeader className="gap-3 border-b border-border bg-muted/20 p-4 pr-12">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={statusTone(job.status)} label={job.status} />
                  {job.errorCategory && (
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-destructive">
                      {job.errorCategory}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{formatDate(job.createdAtUtc)}</span>
              </div>
              <div className="space-y-0.5">
                <SheetTitle className="text-sm capitalize">
                  {job.elementType ?? 'Conversion'} · {job.sourceDomain ?? job.sourcePlatform ?? 'unknown source'}
                </SheetTitle>
                <SheetDescription className="sr-only">Conversion job detail</SheetDescription>
                {job.stage && <p className="font-mono text-[11px] text-muted-foreground">{job.stage}</p>}
              </div>
              <IdField label="Job ID" value={job.jobId} />
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-4">
                {(job.errorCategory || job.errorCode) && (
                  <section className="space-y-2.5">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Failure
                    </h3>
                    <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
                      {job.errorCategory && (
                        <Field label="Category">
                          <span className="font-mono text-destructive">{job.errorCategory}</span>
                        </Field>
                      )}
                      {job.errorCode && (
                        <Field label="Error code">
                          <span className="font-mono">{job.errorCode}</span>
                        </Field>
                      )}
                      {job.retryAfterMs != null && (
                        <Field label="Retry after">{formatDuration(job.retryAfterMs)}</Field>
                      )}
                    </div>
                  </section>
                )}

                <section className="space-y-2.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Timing
                  </h3>
                  <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
                    <Field label="Duration">{formatDuration(job.durationMs) ?? '—'}</Field>
                    <Field label="Persist">{formatDuration(job.persistMs) ?? '—'}</Field>
                    <Field label="First read">{formatDuration(job.firstReadMs) ?? '—'}</Field>
                    <Field label="Started">{formatDate(job.convertStartedAtUtc)}</Field>
                    {job.convertCompletedAtUtc && (
                      <Field label="Completed">{formatDate(job.convertCompletedAtUtc)}</Field>
                    )}
                  </div>
                </section>

                <section className="space-y-2.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Source & target
                  </h3>
                  <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
                    {job.sourceDomain && <Field label="Source domain">{job.sourceDomain}</Field>}
                    {job.sourcePlatform && <Field label="Source platform">{job.sourcePlatform}</Field>}
                    {job.sourceLinkHash && (
                      <Field label="Source hash">
                        <CopyId value={job.sourceLinkHash} label="Source hash" />
                      </Field>
                    )}
                    {job.targetPlatforms.length > 0 && (
                      <Field label="Targets">{job.targetPlatforms.join(', ')}</Field>
                    )}
                    {job.elementType && <Field label="Element">{job.elementType}</Field>}
                    {job.correlationId && (
                      <Field label="Correlation">
                        <CopyId value={job.correlationId} label="Correlation ID" />
                      </Field>
                    )}
                    {job.userId && (
                      <Field label="User">
                        <CopyId value={job.userId} label="User ID" />
                      </Field>
                    )}
                    {job.postId && (
                      <Field label="Post">
                        <CopyId value={job.postId} label="Post ID" />
                      </Field>
                    )}
                  </div>
                </section>

                {canonicalIds.length > 0 && (
                  <section className="space-y-2.5">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Canonical records
                    </h3>
                    <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
                      {canonicalIds.map(([label, value]) => (
                        <Field key={label} label={label}>
                          <CopyId value={value} label={`${label} ID`} />
                        </Field>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-2.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Lambda invocations · {job.lambdaInvocations.length}
                  </h3>
                  {job.lambdaInvocations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No retained lambda events.</p>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40">
                      {job.lambdaInvocations.map((invocation, index) => (
                        <div
                          key={`${invocation.lambdaRequestId ?? invocation.operation}-${index}`}
                          className="space-y-1 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground">{invocation.operation}</span>
                            <StatusPill tone={statusTone(invocation.status)} label={invocation.status} />
                          </div>
                          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                            {[
                              invocation.platform,
                              invocation.elementType,
                              formatDuration(invocation.durationMs),
                              invocation.httpStatus,
                            ]
                              .filter((value) => value != null)
                              .join(' · ')}
                          </p>
                          {invocation.errorCategory && (
                            <p className="font-mono text-[10px] text-destructive">{invocation.errorCategory}</p>
                          )}
                          {invocation.lambdaRequestId && (
                            <CopyId value={invocation.lambdaRequestId} label="Lambda request ID" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-2.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Issue reports · {job.issueReports.length}
                  </h3>
                  {job.issueReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No linked reports.</p>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40">
                      {job.issueReports.map((issue) => (
                        <Link
                          key={issue.id}
                          href={`/internal/issues?issue=${encodeURIComponent(issue.id)}`}
                          className="block px-3 py-2 transition-colors hover:bg-muted/50"
                        >
                          <span className="block text-xs font-medium text-domain">{issue.reportType}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {issue.sourceContext} · {formatDate(issue.createdAt)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
