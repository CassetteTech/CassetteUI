'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Database, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import type {
  InternalSentinelAuditRun,
  InternalSentinelAuditRunsResponse,
  InternalSentinelFinding,
  InternalSentinelFindingsResponse,
  InternalSentinelInvariantRegistryItem,
  InternalSentinelInvariantRegistryResponse,
  InternalSentinelInvariantResult,
} from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { PAGE_SIZE, formatDate } from './internal-utils';
import {
  SectionHeader,
  Panel,
  StatusPill,
  StatStrip,
  Stat,
  DataTable,
  Toolbar,
  SegmentedControl,
  Pagination,
  Field,
  type Column,
  type Tone,
} from './kit';

const ALL_FILTER = 'all';

type SubView = 'findings' | 'runs' | 'invariants';

const SUB_VIEW_OPTIONS: ReadonlyArray<{ value: SubView; label: string }> = [
  { value: 'findings', label: 'Findings' },
  { value: 'runs', label: 'Runs' },
  { value: 'invariants', label: 'Invariants' },
];

function severityTone(severity: string): Tone {
  if (severity === 'Critical') return 'critical';
  if (severity === 'Warning') return 'warning';
  if (severity === 'Info') return 'info';
  return 'neutral';
}

function runStatus(run: InternalSentinelAuditRun) {
  if (run.invariantResults.some((result) => result.maxSeverity === 'Critical')) return 'Critical';
  if (run.invariantResults.some((result) => result.maxSeverity === 'Warning')) return 'Warning';
  if (run.findingCount > 0) return 'Failed';
  return 'Passed';
}

function statusTone(status: string): Tone {
  if (status === 'Passed' || status === 'passed') return 'success';
  if (status === 'Critical') return 'critical';
  if (status === 'Warning' || status === 'failed' || status === 'Failed') return 'warning';
  return 'neutral';
}

/* The status a single invariant earned in a run — collapses severity + finding
   count into one tone so it can drive both the heatmap square and the dot. */
function resultTone(result: InternalSentinelInvariantResult): Tone {
  const label = result.maxSeverity ?? result.status;
  if (label === 'Critical') return 'critical';
  if (label === 'Warning') return 'warning';
  if (result.findingCount > 0) return 'warning';
  if (label === 'Info') return 'info';
  return 'success';
}

/* A short, commit-SHA-style handle so each run row has a stable identity without
   dumping the full id (that lives in the detail sheet). */
function shortRunHandle(runId: string): string {
  const compact = runId.replace(/[^a-zA-Z0-9]/g, '');
  return compact ? compact.slice(0, 7) : runId;
}

function severityRank(result: InternalSentinelInvariantResult): number {
  const label = result.maxSeverity ?? result.status;
  if (label === 'Critical') return 3;
  if (label === 'Warning' || result.findingCount > 0) return 2;
  if (label === 'Info') return 1;
  return 0;
}

/* Solid fills for the contribution-graph squares. Kept here (not in StatusPill)
   because the pill is a text+dot marker, while these are filled cells. */
const HEAT_BG: Record<Tone, string> = {
  success: 'bg-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]',
  critical: 'bg-destructive',
  info: 'bg-[hsl(var(--info))]',
  neutral: 'bg-muted-foreground/25',
  domain: 'bg-domain',
};

function EvidenceList({ evidence }: { evidence: Record<string, string> }) {
  const entries = Object.entries(evidence).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {entries.slice(0, 8).map(([key, value]) => (
        <Field key={key} label={key}>
          <span className="font-mono tabular-nums break-all">{value}</span>
        </Field>
      ))}
      {entries.length > 8 && (
        <span className="pt-1 font-mono text-[10px] text-muted-foreground">
          +{entries.length - 8} more
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── Invariant heatmap ─────────────────────────────
   One square per invariant evaluated in a run, GitHub-contribution-graph style.
   Colour encodes the worst severity that invariant produced. In a table cell the
   squares are inert (native title on hover, row click opens the sheet); inside
   the sheet they become buttons that focus the matching result row. */
function InvariantHeatmap({
  results,
  size = 'sm',
  onSelect,
  selectedId,
}: {
  results: InternalSentinelInvariantResult[];
  size?: 'sm' | 'md';
  onSelect?: (result: InternalSentinelInvariantResult) => void;
  selectedId?: string | null;
}) {
  if (!results.length) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }

  const box = size === 'md' ? 'h-4 w-4' : 'h-3 w-3';

  return (
    <div className="flex flex-wrap gap-[3px]">
      {results.map((result) => {
        const tone = resultTone(result);
        const title = `${result.invariantName} · ${result.findingCount} finding${
          result.findingCount === 1 ? '' : 's'
        }`;
        const selected = selectedId === result.invariantId;
        const base = cn('rounded-[3px] transition', box, HEAT_BG[tone]);

        if (onSelect) {
          return (
            <button
              key={result.invariantId}
              type="button"
              title={title}
              aria-label={title}
              onClick={() => onSelect(result)}
              className={cn(
                base,
                'cursor-pointer hover:opacity-80 focus:outline-none',
                selected && 'ring-2 ring-domain ring-offset-1 ring-offset-background',
              )}
            />
          );
        }

        return <span key={result.invariantId} title={title} className={base} />;
      })}
    </div>
  );
}

function HeatLegend() {
  const items: ReadonlyArray<{ tone: Tone; label: string }> = [
    { tone: 'success', label: 'Pass' },
    { tone: 'warning', label: 'Warning' },
    { tone: 'critical', label: 'Critical' },
  ];
  return (
    <div className="flex items-center gap-3">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className={cn('h-2.5 w-2.5 rounded-[3px]', HEAT_BG[item.tone])} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* Copyable identifier chip — the canonical way IDs surface in the detail sheet.
   IDs are long and noisy in a table row, so they live here where there's room
   to show them in full and one click puts them on the clipboard. */
function CopyId({ value, label }: { value: string; label: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${label}`}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] tabular-nums text-muted-foreground transition hover:border-domain/50 hover:text-foreground"
    >
      <span className="truncate">{value}</span>
      <Copy className="h-3 w-3 shrink-0 opacity-50 transition group-hover:opacity-100" />
    </button>
  );
}

/* Stacked label + copyable id, for long ids that won't sit on a Field's right edge. */
function IdField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <CopyId value={value} label={label} />
    </div>
  );
}

export function SentinelFindingsTab() {
  const [activeView, setActiveView] = useState<SubView>('findings');

  return (
    <div className="space-y-4">
      <SectionHeader
        section="Engineering"
        title="Sentinel"
        actions={
          <SegmentedControl<SubView>
            value={activeView}
            onChange={setActiveView}
            options={SUB_VIEW_OPTIONS}
          />
        }
      />
      {activeView === 'findings' && <SentinelFindingsPanel />}
      {activeView === 'runs' && <SentinelRunsPanel />}
      {activeView === 'invariants' && <SentinelInvariantRegistryPanel />}
    </div>
  );
}

function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      disabled={loading}
      onClick={onClick}
      title="Refresh"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </Button>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
      <span>{message}</span>
      <button type="button" className="underline underline-offset-2" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function SentinelFindingsPanel() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState(ALL_FILTER);
  const [invariantId, setInvariantId] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<InternalSentinelFindingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiService.getInternalSentinelFindings({
        q: debouncedSearch || undefined,
        severity: severity === ALL_FILTER ? undefined : severity,
        invariantId: invariantId === ALL_FILTER ? undefined : invariantId,
        page,
        pageSize: PAGE_SIZE,
      });
      setResponse(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Sentinel findings');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, severity, invariantId, page]);

  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);

  const findings = response?.items ?? [];
  const total = response?.totalItems ?? 0;
  const invariantOptions = Array.from(new Set([
    ...findings.map((finding) => finding.invariantId),
    ...(invariantId === ALL_FILTER ? [] : [invariantId]),
  ])).sort();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSeverityChange = (value: string) => {
    setSeverity(value);
    setPage(1);
  };

  const handleInvariantChange = (value: string) => {
    setInvariantId(value);
    setPage(1);
  };

  const columns: Column<InternalSentinelFinding>[] = [
    {
      key: 'finding',
      header: 'Finding',
      valign: 'top',
      cell: (row) => (
        <div className="space-y-1">
          <StatusPill tone={severityTone(row.severity)} label={row.severity} />
          <p className="text-xs font-medium text-foreground">{row.summary}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{row.invariantId}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground/70">{row.fingerprint}</p>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      valign: 'top',
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs text-foreground">{row.entityType}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.entityId}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground/70">{row.occurrenceCount} occ.</p>
        </div>
      ),
    },
    {
      key: 'evidence',
      header: 'Evidence',
      className: 'hidden xl:table-cell',
      valign: 'top',
      cell: (row) => <EvidenceList evidence={row.evidence} />,
    },
    {
      key: 'last_seen',
      header: 'Last seen',
      align: 'right',
      valign: 'top',
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{formatDate(row.lastSeenAtUtc)}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground/70">{row.lastRunId}</p>
        </div>
      ),
    },
  ];

  return (
    <Panel
      title={total > 0 ? `Findings · ${total}` : 'Findings'}
      actions={<RefreshButton loading={loading} onClick={() => void loadFindings()} />}
    >
      <div className="border-b border-border px-3 py-2">
        <Toolbar
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search fingerprint, invariant, entity, summary"
          filters={
            <>
              <Select value={severity} onValueChange={handleSeverityChange}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All severities</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={invariantId} onValueChange={handleInvariantChange}>
                <SelectTrigger className="h-8 w-[200px] text-xs">
                  <SelectValue placeholder="Invariant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All invariants</SelectItem>
                  {invariantOptions.map((id) => (
                    <SelectItem key={id} value={id}>{id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={() => void loadFindings()} />}

      <DataTable<InternalSentinelFinding>
        columns={columns}
        rows={findings}
        rowKey={(row) => row.fingerprint}
        isLoading={loading && !findings.length}
        empty={{
          icon: Database,
          title: 'No findings',
          description: 'No Sentinel findings match these filters.',
        }}
        renderMobile={(row) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <StatusPill tone={severityTone(row.severity)} label={row.severity} />
              <span className="text-[10px] text-muted-foreground">{formatDate(row.lastSeenAtUtc)}</span>
            </div>
            <p className="text-xs font-medium text-foreground">{row.summary}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{row.invariantId}</p>
            <div className="flex gap-3 font-mono text-[10px] tabular-nums text-muted-foreground">
              <span>{row.entityType} {row.entityId}</span>
              <span>{row.occurrenceCount} occ.</span>
            </div>
          </div>
        )}
      />

      <Pagination
        page={response?.page ?? page}
        totalPages={response?.totalPages ?? 1}
        totalItems={response?.totalItems ?? 0}
        itemLabel="findings"
        isLoading={loading}
        onPageChange={setPage}
      />
    </Panel>
  );
}

function SentinelRunsPanel() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<InternalSentinelAuditRunsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<InternalSentinelAuditRun | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiService.getInternalSentinelRuns({
        q: debouncedSearch || undefined,
        status: status === ALL_FILTER ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      });
      setResponse(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Sentinel runs');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, page]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  const runs = response?.items ?? [];
  const total = response?.totalItems ?? 0;

  const openRun = (run: InternalSentinelAuditRun) => {
    setSelectedRun(run);
    setSheetOpen(true);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const columns: Column<InternalSentinelAuditRun>[] = [
    {
      key: 'run',
      header: 'Run',
      valign: 'top',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-medium tabular-nums text-foreground">
              {shortRunHandle(row.runId)}
            </span>
            {row.environmentName && (
              <span className="rounded border border-border bg-muted/40 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                {row.environmentName}
              </span>
            )}
          </div>
          {row.targetEntityType && row.targetEntityId ? (
            <p className="text-[10px] text-muted-foreground">
              {row.targetEntityType} · <span className="font-mono tabular-nums">{row.targetEntityId}</span>
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">{row.invariantCount} invariants checked</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      valign: 'top',
      cell: (row) => {
        const statusLabel = runStatus(row);
        return (
          <div className="space-y-1">
            <StatusPill tone={statusTone(statusLabel)} label={statusLabel} />
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {row.findingCount} finding{row.findingCount === 1 ? '' : 's'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'checks',
      header: 'Checks',
      className: 'max-w-[300px]',
      valign: 'top',
      cell: (row) => (
        <InvariantHeatmap
          results={[...row.invariantResults].sort((a, b) => severityRank(b) - severityRank(a))}
        />
      ),
    },
    {
      key: 'completed',
      header: 'Completed',
      align: 'right',
      valign: 'top',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.completedAtUtc)}</span>
      ),
    },
  ];

  return (
    <>
      <Panel
        title={total > 0 ? `Runs · ${total}` : 'Runs'}
        actions={<RefreshButton loading={loading} onClick={() => void loadRuns()} />}
      >
        <div className="border-b border-border px-3 py-2">
          <Toolbar
            search={search}
            onSearchChange={handleSearchChange}
            searchPlaceholder="Search run, environment, or target"
            filters={
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER}>All runs</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">With findings</SelectItem>
                </SelectContent>
              </Select>
            }
          />
        </div>

        {error && <ErrorBanner message={error} onRetry={() => void loadRuns()} />}

        <DataTable<InternalSentinelAuditRun>
          columns={columns}
          rows={runs}
          rowKey={(row) => row.runId}
          onRowClick={openRun}
          selectedKey={sheetOpen ? selectedRun?.runId ?? null : null}
          isLoading={loading && !runs.length}
          empty={{
            icon: Database,
            title: 'No runs',
            description: 'No persisted Sentinel audit runs match these filters.',
          }}
          renderMobile={(row) => {
            const statusLabel = runStatus(row);
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <StatusPill tone={statusTone(statusLabel)} label={statusLabel} />
                  <span className="text-[10px] text-muted-foreground">{formatDate(row.completedAtUtc)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-medium tabular-nums text-foreground">
                    {shortRunHandle(row.runId)}
                  </span>
                  {row.environmentName && (
                    <span className="rounded border border-border bg-muted/40 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                      {row.environmentName}
                    </span>
                  )}
                </div>
                <InvariantHeatmap
                  results={[...row.invariantResults].sort((a, b) => severityRank(b) - severityRank(a))}
                />
                <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                  {row.findingCount} finding{row.findingCount === 1 ? '' : 's'} · {row.invariantCount} invariants
                </p>
              </div>
            );
          }}
        />

        <Pagination
          page={response?.page ?? page}
          totalPages={response?.totalPages ?? 1}
          totalItems={response?.totalItems ?? 0}
          itemLabel="runs"
          isLoading={loading}
          onPageChange={setPage}
        />
      </Panel>

      <SentinelRunDetailSheet run={selectedRun} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

/* Slide-in detail for a single audit run. Holds everything that used to clutter
   the table row — run id, environment, metadata, and the full per-invariant
   breakdown — so the list itself can stay scannable. */
function SentinelRunDetailSheet({
  run,
  open,
  onOpenChange,
}: {
  run: InternalSentinelAuditRun | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedInvariantId, setSelectedInvariantId] = useState<string | null>(null);

  // Clear the in-sheet highlight whenever a different run is opened.
  useEffect(() => {
    setSelectedInvariantId(null);
  }, [run?.runId]);

  const status = run ? runStatus(run) : 'Passed';
  const metadataEntries = run
    ? Object.entries(run.runMetadata).sort(([a], [b]) => a.localeCompare(b))
    : [];
  const sortedResults = run
    ? [...run.invariantResults].sort((a, b) => severityRank(b) - severityRank(a))
    : [];
  const passedCount = run
    ? run.invariantResults.filter((result) => severityRank(result) === 0).length
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="domain-eng flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {run && (
          <>
            <SheetHeader className="gap-3 border-b border-border bg-muted/20 p-4 pr-12">
              <div className="flex items-center justify-between gap-2">
                <StatusPill tone={statusTone(status)} label={status} />
                <span className="text-[10px] text-muted-foreground">{formatDate(run.completedAtUtc)}</span>
              </div>
              <div className="space-y-0.5">
                <SheetTitle className="text-sm">Audit run</SheetTitle>
                <SheetDescription className="sr-only">Sentinel audit run detail</SheetDescription>
                <p className="text-[11px] text-muted-foreground">
                  {run.environmentName || 'Unknown environment'}
                </p>
              </div>
              <IdField label="Run ID" value={run.runId} />
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-4">
                <StatStrip>
                  <Stat label="Findings" value={run.findingCount} tone={statusTone(status)} />
                  <Stat label="Invariants" value={run.invariantResults.length} />
                  <Stat label="Passed" value={passedCount} tone={passedCount ? 'success' : 'neutral'} />
                </StatStrip>

                <section className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Invariant map
                    </h3>
                    <HeatLegend />
                  </div>
                  <InvariantHeatmap
                    results={sortedResults}
                    size="md"
                    selectedId={selectedInvariantId}
                    onSelect={(result) =>
                      setSelectedInvariantId((current) =>
                        current === result.invariantId ? null : result.invariantId,
                      )
                    }
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Each square is one invariant — tap to highlight it below.
                  </p>
                </section>

                <section className="space-y-2.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Run details
                  </h3>
                  <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
                    <Field label="Environment">{run.environmentName || '—'}</Field>
                    {run.targetEntityType && run.targetEntityId && (
                      <Field label="Target">
                        <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <span className="text-foreground">{run.targetEntityType}</span>
                          <CopyId value={run.targetEntityId} label="Target ID" />
                        </span>
                      </Field>
                    )}
                    <Field label="Started">{formatDate(run.startedAtUtc)}</Field>
                    <Field label="Completed">{formatDate(run.completedAtUtc)}</Field>
                    {metadataEntries.map(([key, value]) => (
                      <Field key={key} label={key}>
                        <span className="break-all font-mono tabular-nums">{value || '—'}</span>
                      </Field>
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Results · {sortedResults.length}
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-border divide-y divide-border/60">
                    {sortedResults.map((result) => {
                      const tone = resultTone(result);
                      const selected = selectedInvariantId === result.invariantId;
                      return (
                        <div
                          key={result.invariantId}
                          className={cn(
                            'px-3 py-2 transition',
                            selected ? 'bg-domain/[0.07]' : 'bg-card hover:bg-muted/30',
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', HEAT_BG[tone])}
                                aria-hidden
                              />
                              <p className="min-w-0 truncate text-xs font-medium text-foreground">
                                {result.invariantName}
                              </p>
                            </div>
                            <StatusPill
                              tone={statusTone(result.maxSeverity ?? result.status)}
                              label={`${result.findingCount}`}
                            />
                          </div>
                          {result.invariantDescription && (
                            <p className="mt-1 pl-[18px] text-[11px] leading-snug text-muted-foreground">
                              {result.invariantDescription}
                            </p>
                          )}
                          <div className="mt-1.5 flex items-center justify-between gap-2 pl-[18px]">
                            <CopyId value={result.invariantId} label="Invariant ID" />
                            <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
                              {result.scope}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SentinelInvariantRegistryPanel() {
  const [response, setResponse] = useState<InternalSentinelInvariantRegistryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRegistry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiService.getInternalSentinelInvariantRegistry();
      setResponse(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Sentinel invariants');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRegistry();
  }, [loadRegistry]);

  const invariants = response?.items ?? [];

  // Group the registry by scope so each invariant type is its own section
  // rather than a single column value.
  const scopeGroups = useMemo(() => {
    const map = new Map<string, InternalSentinelInvariantRegistryItem[]>();
    for (const item of response?.items ?? []) {
      const key = item.scope?.trim() || 'Uncategorized';
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [response]);

  // Scope is now the section heading, so it's dropped from the columns. Every
  // column top-aligns so a multi-line "What it tests" doesn't shove the name and
  // status pill to the vertical centre of a tall row.
  const columns: Column<InternalSentinelInvariantRegistryItem>[] = [
    {
      key: 'invariant',
      header: 'Invariant',
      valign: 'top',
      // Fixed width in every scope table so the name column lines up across panels.
      className: 'w-[260px]',
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium leading-snug text-foreground">{row.invariantName}</p>
          <p className="break-all font-mono text-[10px] tabular-nums text-muted-foreground">{row.invariantId}</p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'What it tests',
      // No width cap: this is the single flexible column, so it absorbs the row's
      // remaining space and aligns consistently because every other column is fixed.
      className: 'hidden md:table-cell pr-8',
      valign: 'top',
      cell: (row) => (
        <p className="max-w-prose whitespace-normal text-xs leading-5 text-muted-foreground">
          {row.invariantDescription}
        </p>
      ),
    },
    {
      key: 'latest_result',
      header: 'Latest',
      valign: 'top',
      className: 'w-[120px] whitespace-nowrap',
      cell: (row) => (
        <StatusPill
          tone={statusTone(row.latestMaxSeverity ?? row.latestStatus)}
          label={`${row.latestFindingCount} finding${row.latestFindingCount === 1 ? '' : 's'}`}
        />
      ),
    },
    {
      key: 'last_evaluated',
      header: 'Evaluated',
      align: 'right',
      valign: 'top',
      className: 'w-[180px] whitespace-nowrap',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.latestEvaluatedAtUtc)}</span>
      ),
    },
  ];

  const renderMobile = (row: InternalSentinelInvariantRegistryItem) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">{row.invariantName}</p>
        <StatusPill tone={statusTone(row.latestMaxSeverity ?? row.latestStatus)} label={`${row.latestFindingCount}`} />
      </div>
      <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.invariantId}</p>
      <p className="text-[11px] leading-5 text-muted-foreground">{row.invariantDescription}</p>
    </div>
  );

  // Loading / empty / error: render a single framing panel.
  if (error || !invariants.length) {
    return (
      <Panel
        title="Invariants"
        actions={<RefreshButton loading={loading} onClick={() => void loadRegistry()} />}
      >
        {error && <ErrorBanner message={error} onRetry={() => void loadRegistry()} />}
        <DataTable<InternalSentinelInvariantRegistryItem>
          columns={columns}
          rows={[]}
          rowKey={(row) => row.invariantId}
          isLoading={loading}
          empty={{
            icon: Database,
            title: 'No invariants',
            description: 'No Sentinel invariant results have been persisted yet.',
          }}
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      {scopeGroups.map(([scope, items], index) => (
        <Panel
          key={scope}
          title={`${scope} · ${items.length}`}
          actions={index === 0 ? <RefreshButton loading={loading} onClick={() => void loadRegistry()} /> : undefined}
        >
          <DataTable<InternalSentinelInvariantRegistryItem>
            columns={columns}
            rows={items}
            rowKey={(row) => row.invariantId}
            renderMobile={renderMobile}
          />
        </Panel>
      ))}
    </div>
  );
}
