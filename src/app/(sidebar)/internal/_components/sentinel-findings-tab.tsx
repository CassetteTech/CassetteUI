'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { PAGE_SIZE, formatDate } from './internal-utils';
import {
  SectionHeader,
  Panel,
  StatusPill,
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

function MetadataList({ metadata }: { metadata: Record<string, string> }) {
  const entries = Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) return <span className="text-xs text-muted-foreground">—</span>;

  return (
    <div className="flex flex-col divide-y divide-border/40">
      {entries.map(([key, value]) => (
        <Field key={key} label={key}>
          <span className="font-mono tabular-nums">{value}</span>
        </Field>
      ))}
    </div>
  );
}

function InvariantResultList({ results }: { results: InternalSentinelInvariantResult[] }) {
  if (!results.length) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {results.map((result) => {
        const statusLabel = result.maxSeverity ?? result.status;
        return (
          <div key={result.invariantId} className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill
                tone={statusTone(statusLabel)}
                label={`${result.findingCount} findings`}
              />
              <span className="text-xs font-medium text-foreground">{result.invariantName}</span>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{result.invariantId}</span>
            </div>
            <p className="text-[11px] leading-4 text-muted-foreground">
              {result.invariantDescription}
            </p>
          </div>
        );
      })}
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
      cell: (row) => (
        <div className="space-y-0.5">
          <StatusPill tone={severityTone(row.severity)} label={row.severity} />
          <p className="text-xs font-medium text-foreground">{row.summary}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{row.invariantId}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.fingerprint}</p>
        </div>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs text-foreground">{row.entityType}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.entityId}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.occurrenceCount} occ.</p>
        </div>
      ),
    },
    {
      key: 'evidence',
      header: 'Evidence',
      className: 'hidden xl:table-cell',
      cell: (row) => <EvidenceList evidence={row.evidence} />,
    },
    {
      key: 'last_seen',
      header: 'Last seen',
      align: 'right',
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{formatDate(row.lastSeenAtUtc)}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.lastRunId}</p>
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
      cell: (row) => (
        <div className="space-y-1">
          <p className="font-mono text-[11px] tabular-nums text-foreground">{row.runId}</p>
          <MetadataList metadata={row.runMetadata} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => {
        const statusLabel = runStatus(row);
        return (
          <div className="space-y-0.5">
            <StatusPill tone={statusTone(statusLabel)} label={statusLabel} />
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {row.findingCount} findings
            </p>
          </div>
        );
      },
    },
    {
      key: 'target',
      header: 'Target',
      className: 'hidden md:table-cell',
      cell: (row) =>
        row.targetEntityType && row.targetEntityId ? (
          <div className="space-y-0.5">
            <p className="text-xs text-foreground">{row.targetEntityType}</p>
            <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.targetEntityId}</p>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        ),
    },
    {
      key: 'invariant_results',
      header: 'Invariant results',
      className: 'hidden xl:table-cell',
      cell: (row) => <InvariantResultList results={row.invariantResults} />,
    },
    {
      key: 'completed',
      header: 'Completed',
      align: 'right',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatDate(row.completedAtUtc)}</span>
      ),
    },
  ];

  return (
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
        isLoading={loading && !runs.length}
        empty={{
          icon: Database,
          title: 'No runs',
          description: 'No persisted Sentinel audit runs match these filters.',
        }}
        renderMobile={(row) => {
          const statusLabel = runStatus(row);
          return (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <StatusPill tone={statusTone(statusLabel)} label={statusLabel} />
                <span className="text-[10px] text-muted-foreground">{formatDate(row.completedAtUtc)}</span>
              </div>
              <p className="font-mono text-[11px] tabular-nums text-foreground">{row.runId}</p>
              <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.findingCount} findings</p>
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

  // Scope is now the section heading, so it's dropped from the columns.
  const columns: Column<InternalSentinelInvariantRegistryItem>[] = [
    {
      key: 'invariant',
      header: 'Invariant',
      cell: (row) => (
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-foreground">{row.invariantName}</p>
          <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{row.invariantId}</p>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'What it tests',
      className: 'hidden md:table-cell',
      cell: (row) => (
        <span className="text-xs leading-5 text-foreground">{row.invariantDescription}</span>
      ),
    },
    {
      key: 'latest_result',
      header: 'Latest',
      cell: (row) => (
        <StatusPill
          tone={statusTone(row.latestMaxSeverity ?? row.latestStatus)}
          label={`${row.latestFindingCount} findings`}
        />
      ),
    },
    {
      key: 'last_evaluated',
      header: 'Evaluated',
      align: 'right',
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
      <p className="text-[11px] leading-4 text-muted-foreground">{row.invariantDescription}</p>
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
