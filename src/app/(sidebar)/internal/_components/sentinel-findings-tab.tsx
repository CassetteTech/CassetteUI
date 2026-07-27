'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { Copy, Database, GitMerge, ListChecks, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '@/services/api';
import type {
  ConversionIssueRevalidationSummary,
  StubDuplicateAdjudicationSummary,
  InternalSentinelAuditRun,
  InternalSentinelAuditRunsResponse,
  InternalSentinelFinding,
  InternalSentinelFindingsResponse,
  InternalSentinelInvariantNote,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { PAGE_SIZE, copyToClipboard, formatDate } from './internal-utils';
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
  ErrorBanner,
  RefreshButton,
  CopyId,
  IdField,
  type Column,
  type Tone,
} from './kit';
import { SentinelRuntimePanel } from './sentinel-runtime-panel';

const ALL_FILTER = 'all';
const COORDINATOR_PAGE_SIZE = 100;

type SubView = 'runtime' | 'findings' | 'runs' | 'invariants';

const SUB_VIEWS: readonly SubView[] = ['runtime', 'findings', 'runs', 'invariants'];

function isSubView(value: string | null): value is SubView {
  return value != null && (SUB_VIEWS as readonly string[]).includes(value);
}

/* Findings are machine-only: active or resolved, decided exclusively by
   Sentinel scans. Humans get an indirect lever (Rescan) and a human layer
   (per-invariant cause annotations); nothing here can set a finding status. */
type FindingStatus = 'active' | 'resolved';

const FINDING_STATUS_OPTIONS: ReadonlyArray<{ value: FindingStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

function findingStatusTone(status: string): Tone {
  if (status === 'active') return 'warning';
  if (status === 'resolved') return 'success';
  return 'neutral';
}

/* Recurrence marker: a finding that came back after being resolved is the
   most urgent thing on the page, so it gets the one loud treatment in the
   row — colour-only mono text, no filled chip. */
function RecurrenceBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-destructive">
      recurred ×{count}
    </span>
  );
}

const SUB_VIEW_OPTIONS: ReadonlyArray<{ value: SubView; label: string }> = [
  { value: 'runtime', label: 'Runtime' },
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

function formatPromptFields(entries: Array<[string, string]>): string {
  if (!entries.length) return '- none';
  return entries.map(([key, value]) => `- ${key}: ${value || '(empty)'}`).join('\n');
}

function likelyIdEntry([key, value]: [string, string]): boolean {
  if (!value || value === 'missing') return false;
  return key === 'id' || key.endsWith('_id') || key.endsWith('_ids') || key.includes('fingerprint');
}

const COORDINATION_EVIDENCE_KEYS = [
  'query_name',
  'issue_type',
  'issue_severity',
  'entity_type',
  'related_entity_type',
  'trigger_source',
  'expected_condition',
] as const;

function normalizeCoordinationValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function buildFindingCoordinationKey(finding: InternalSentinelFinding): string {
  const parts = [`invariant:${finding.invariantId}`];
  for (const key of COORDINATION_EVIDENCE_KEYS) {
    const value = finding.evidence[key];
    if (!value || value === 'missing') continue;
    parts.push(`${key}:${normalizeCoordinationValue(value)}`);
  }

  return parts.join(' | ');
}

function buildFindingItemKey(finding: InternalSentinelFinding): string {
  const affectedType = finding.evidence.entity_type;
  const affectedId = finding.evidence.entity_id;
  const affectedPart = affectedType && affectedId && affectedType !== 'missing' && affectedId !== 'missing'
    ? ` | affected:${affectedType}/${affectedId}`
    : '';

  return `${finding.fingerprint} | sentinel_entity:${finding.entityType}/${finding.entityId}${affectedPart}`;
}

function buildFindingInvestigationPrompt(
  finding: InternalSentinelFinding,
  note: InternalSentinelInvariantNote | null,
): string {
  const evidenceEntries = Object.entries(finding.evidence).sort(([a], [b]) => a.localeCompare(b));
  const logEntries = evidenceEntries.filter(([key]) => key.startsWith('log_'));
  const evidenceIdEntries = evidenceEntries.filter(likelyIdEntry);
  const idEntries: Array<[string, string]> = [
    ['fingerprint', finding.fingerprint],
    ['invariant_id', finding.invariantId],
    ['entity_type', finding.entityType],
    ['entity_id', finding.entityId],
    ['last_run_id', finding.lastRunId],
    ...evidenceIdEntries,
  ];
  const noteEntries: Array<[string, string]> = [];
  if (note) {
    noteEntries.push(
      ['root_cause_summary', note.rootCauseSummary ?? ''],
      ['fixed_in_reference', note.fixedInReference ?? ''],
      ['regression_test_reference', note.regressionTestReference ?? ''],
      ['residue_note', note.residueNote ?? ''],
      ['updated_by', note.updatedBy],
      ['updated_at_utc', note.updatedAtUtc],
    );
  }
  const coordinationKey = buildFindingCoordinationKey(finding);
  const itemKey = buildFindingItemKey(finding);

  return [
    'Investigate and fix this Cassette Sentinel finding. Find the root cause; do not apply a bandaid, hide the symptom, or add fallback logic that masks a broken contract.',
    '',
    'You are working in /Users/matttoppi/matt/dev/cassette/cassetteplatform, a multi-repo Cassette workspace. Read the relevant AGENTS.md before editing. The likely repos are CassetteBridge, cassette-sentinel, MusicPlatformLambdas, and CassetteUI only if the display layer is involved.',
    '',
    'Recommended thread title:',
    `Sentinel ${coordinationKey}`,
    '',
    'Tooling available:',
    '- AWS CLI access for CloudWatch, ECS/App Runner, SQS, and deployed-service inspection.',
    '- Supabase CLI access for project inspection and database workflows.',
    '- Terminal access in the Cassette workspace.',
    '',
    'Hard safety requirements:',
    '- Do not make any database changes without explicit human approval.',
    '- For any DB repair, produce read-only SELECT verification plus a dry-run or transaction plan first.',
    '- Keep production database access read-only until the repair plan is reviewed.',
    '- Fix the root cause with the smallest correct code change and targeted verification.',
    '- Do not add frontend-only or backend fallback paths that mask a broken data contract.',
    '',
    'Parallelization and dedupe guard:',
    `- item_key: ${itemKey}`,
    `- coordination_key: ${coordinationKey}`,
    '- Multiple findings with the same coordination_key are the same root-cause workstream. Do not let two agents independently patch code for the same coordination_key.',
    '- If another active thread/task already owns this coordination_key, attach this item_key and evidence to that workstream instead of starting duplicate implementation work.',
    '- DB remediation can be batched across item_keys sharing this coordination_key, but the shared code root-cause investigation should happen once.',
    '',
    'For a new coordination_key, spawn exactly two subagents before implementing:',
    '1. DB remediation subagent: enumerate all active DB rows/items that share this coordination_key, identify the exact tables involved, write read-only verification queries, and propose one dry-run batch repair plan. Do not mutate the DB.',
    '2. Code root-cause subagent: trace where this coordination_key is created in code, inspect adjacent callers/callees/tests, and propose the smallest code fix that prevents recurrence for all matching item_keys without breaking existing conversion behavior.',
    '',
    'After both subagents report back, combine their findings. Implement code changes only when the root cause is clear. Ask for approval before any DB mutation, even if the dry-run looks safe.',
    '',
    'Finding context:',
    `- coordination_key: ${coordinationKey}`,
    `- item_key: ${itemKey}`,
    `- summary: ${finding.summary}`,
    `- severity: ${finding.severity}`,
    `- status: ${finding.status}`,
    `- first_seen_at_utc: ${finding.firstSeenAtUtc}`,
    `- last_seen_at_utc: ${finding.lastSeenAtUtc}`,
    `- last_observed_at_utc: ${finding.lastObservedAtUtc}`,
    `- occurrence_count: ${finding.occurrenceCount}`,
    `- recurrence_count: ${finding.recurrenceCount}`,
    `- resolved_at_utc: ${finding.resolvedAtUtc ?? 'n/a'}`,
    `- resolved_by_run_id: ${finding.resolvedByRunId ?? 'n/a'}`,
    `- last_reactivated_at_utc: ${finding.lastReactivatedAtUtc ?? 'n/a'}`,
    `- last_reactivated_run_id: ${finding.lastReactivatedRunId ?? 'n/a'}`,
    '',
    'Relevant IDs:',
    formatPromptFields(idEntries),
    '',
    'Persisted evidence:',
    formatPromptFields(evidenceEntries),
    '',
    'Persisted log evidence:',
    logEntries.length
      ? formatPromptFields(logEntries)
      : '- none attached. If logs are needed, use AWS CLI/CloudWatch around the timestamps and IDs above.',
    '',
    'Invariant annotation:',
    formatPromptFields(noteEntries.filter(([, value]) => Boolean(value))),
  ].join('\n');
}

function groupFindingsByCoordinationKey(findings: InternalSentinelFinding[]) {
  const groups = new Map<string, InternalSentinelFinding[]>();
  for (const finding of findings) {
    const key = buildFindingCoordinationKey(finding);
    groups.set(key, [...(groups.get(key) ?? []), finding]);
  }

  return [...groups.entries()]
    .map(([coordinationKey, groupFindings]) => ({
      coordinationKey,
      findings: groupFindings.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
    }))
    .sort((a, b) =>
      b.findings.length - a.findings.length ||
      a.coordinationKey.localeCompare(b.coordinationKey),
    );
}

function formatCoordinatorFinding(finding: InternalSentinelFinding): string {
  const evidenceEntries = Object.entries(finding.evidence).sort(([a], [b]) => a.localeCompare(b));
  return [
    `  - item_key: ${buildFindingItemKey(finding)}`,
    `    summary: ${finding.summary}`,
    `    severity: ${finding.severity}`,
    `    last_seen_at_utc: ${finding.lastSeenAtUtc}`,
    `    occurrence_count: ${finding.occurrenceCount}`,
    `    evidence:\n${formatPromptFields(evidenceEntries).replace(/^/gm, '      ')}`,
  ].join('\n');
}

function buildCoordinatorPrompt(findings: InternalSentinelFinding[]): string {
  const groups = groupFindingsByCoordinationKey(findings);
  const groupSections = groups.length
    ? groups.map((group, index) => [
        `Group ${index + 1}:`,
        `- coordination_key: ${group.coordinationKey}`,
        `- item_count: ${group.findings.length}`,
        '- active_items:',
        group.findings.map(formatCoordinatorFinding).join('\n'),
      ].join('\n')).join('\n\n')
    : '- No active findings were returned by the internal Sentinel API at prompt-copy time.';

  return [
    'Coordinate Cassette Sentinel remediation across all currently active findings. Your job is orchestration and dedupe first; do not directly patch code or mutate the database in this coordinator thread.',
    '',
    'You are working in /Users/matttoppi/matt/dev/cassette/cassetteplatform, a multi-repo Cassette workspace. Read the root AGENTS.md and relevant child repo AGENTS.md files before assigning work.',
    '',
    'Tooling available:',
    '- AWS CLI access for CloudWatch, ECS/App Runner, SQS, and deployed-service inspection.',
    '- Supabase CLI access for project inspection and database workflows.',
    '- Terminal access in the Cassette workspace.',
    '',
    'Hard safety requirements:',
    '- Do not make any database changes without explicit human approval.',
    '- Require read-only SELECT verification and a dry-run or transaction plan before any DB repair.',
    '- Keep production database access read-only until a human approves the exact mutation plan.',
    '- Do not add fallbacks or masking logic. Every worker must find the root cause.',
    '',
    'Coordinator workflow:',
    '1. Treat coordination_key as the unit of code ownership. There must be at most one implementation worker per coordination_key.',
    '2. Treat item_key as the unit of DB/entity remediation. A coordination_key may have many item_keys, and the DB plan should batch them when safe.',
    '3. Before assigning workers, verify the current active set by querying the internal Sentinel findings API or Supabase. Page through `/api/v1/internal/sentinel/findings?status=active&pageSize=100`; do not assume this copied prompt is still complete.',
    '4. Build a work ledger with coordination_key, owner, item_keys, status, code PR/fix reference, DB dry-run reference, and approval state.',
    '5. For each new coordination_key, start exactly one worker thread/task. Give that worker all item_keys and evidence for the group.',
    '6. In each worker, require two subagents: one DB remediation subagent for the full item_key batch, and one code root-cause subagent for the shared coordination_key.',
    '7. If a coordination_key is already owned by another active worker, append new item_keys/evidence to that worker instead of starting duplicate code work.',
    '',
    'Current active findings fetched for this seed prompt:',
    `- active_finding_count: ${findings.length}`,
    `- coordination_group_count: ${groups.length}`,
    '',
    'Grouped findings:',
    groupSections,
  ].join('\n');
}

async function fetchAllActiveFindings(): Promise<InternalSentinelFinding[]> {
  const firstPage = await apiService.getInternalSentinelFindings({
    status: 'active',
    page: 1,
    pageSize: COORDINATOR_PAGE_SIZE,
  });
  const findings = [...firstPage.items];

  const remainingPageNumbers = Array.from(
    { length: Math.max(0, firstPage.totalPages - 1) },
    (_, index) => index + 2,
  );
  const remainingPages = await Promise.all(remainingPageNumbers.map((page) =>
    apiService.getInternalSentinelFindings({
      status: 'active',
      page,
      pageSize: COORDINATOR_PAGE_SIZE,
    }),
  ));
  for (const page of remainingPages) {
    findings.push(...page.items);
  }

  return findings;
}

function CopyCoordinatorPromptButton() {
  const [pending, setPending] = useState(false);

  const copyPrompt = async () => {
    setPending(true);
    try {
      const findings = await fetchAllActiveFindings();
      await copyToClipboard(buildCoordinatorPrompt(findings), 'Coordinator prompt');
    } catch (promptError) {
      toast.error(
        promptError instanceof Error
          ? promptError.message
          : 'Failed to build coordinator prompt',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      disabled={pending}
      onClick={() => void copyPrompt()}
      title="Copy coordinator prompt for all active findings"
    >
      <Copy className="h-3 w-3" />
      {pending ? 'Building...' : 'Coordinator'}
    </Button>
  );
}

function CopyFindingPromptButton({
  finding,
  note,
}: {
  finding: InternalSentinelFinding;
  note: InternalSentinelInvariantNote | null;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs"
      onClick={() =>
        void copyToClipboard(buildFindingInvestigationPrompt(finding, note), 'Investigation prompt')
      }
      title="Copy AI investigation prompt"
    >
      <Copy className="h-3 w-3" />
      Copy prompt
    </Button>
  );
}

export function SentinelFindingsTab() {
  const searchParams = useSearchParams();
  const paramView = searchParams.get('view');
  const [activeView, setActiveView] = useState<SubView>(isSubView(paramView) ? paramView : 'findings');

  /* View selection is mirrored into `?view=` (replaceState, no navigation) so
     Sentinel views are deep-linkable; `?job=` only applies to the runtime view
     and is dropped when leaving it. */
  const changeView = (view: SubView) => {
    setActiveView(view);
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (view !== 'runtime') url.searchParams.delete('job');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        section="Engineering"
        title="Sentinel"
        actions={
          <SegmentedControl<SubView>
            value={activeView}
            onChange={changeView}
            options={SUB_VIEW_OPTIONS}
          />
        }
      />
      {activeView === 'runtime' && <SentinelRuntimePanel />}
      {activeView === 'findings' && <SentinelFindingsPanel />}
      {activeView === 'runs' && <SentinelRunsPanel />}
      {activeView === 'invariants' && <SentinelInvariantRegistryPanel />}
    </div>
  );
}

/* Rescan: the one lever operators have over finding status, and it is
   indirect — it queues an audit.requested run for the Sentinel worker and the
   scan decides. Deliberately quiet: ghost variant, small, no colour.
   `withTitle={false}` drops the native tooltip when a richer Radix tooltip
   wraps the button (the maintenance strip). */
function RescanButton({
  invariantId,
  label,
  withTitle = true,
}: {
  invariantId?: string;
  label?: string;
  withTitle?: boolean;
}) {
  const [pending, setPending] = useState(false);

  const rescan = async () => {
    setPending(true);
    try {
      await apiService.requestInternalSentinelRescan(invariantId);
      toast.success(
        invariantId ? `Rescan queued for ${invariantId}` : 'Full rescan queued',
        {
          description:
            'Async — the run lands in ~30–90 s; a busy queue or a first-attempt retry (~5 min) adds time.',
        },
      );
    } catch (rescanError) {
      toast.error(rescanError instanceof Error ? rescanError.message : 'Rescan request failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      disabled={pending}
      onClick={() => void rescan()}
      title={
        withTitle
          ? invariantId
            ? `Queue an async full-scope rescan of ${invariantId}`
            : 'Queue an async full Sentinel rescan'
          : undefined
      }
    >
      <RotateCcw className={`h-3 w-3 ${pending ? 'animate-spin' : ''}`} />
      {label ?? 'Rescan'}
    </Button>
  );
}

/* Revalidate: sweeps every unresolved conversion issue and resolves the ones
   whose detection condition no longer holds. Unlike Rescan, the Bridge endpoint
   runs synchronously and hands back a summary, so we surface the resolved /
   still-holding / skipped counts inline rather than waiting on a worker pass.
   Kept as quiet as Rescan — ghost, small, no colour. */
function RevalidateIssuesButton({ withTitle = true }: { withTitle?: boolean }) {
  const [pending, setPending] = useState(false);

  const revalidate = async () => {
    setPending(true);
    try {
      const summary: ConversionIssueRevalidationSummary =
        await apiService.revalidateInternalConversionIssues();
      toast.success(
        `Revalidated ${summary.checked} issue${summary.checked === 1 ? '' : 's'}`,
        {
          description: `${summary.resolved} resolved · ${summary.stillHolding} still holding · ${summary.skippedUnknown} skipped. Findings are untouched — a full rescan resolves those.`,
        },
      );
    } catch (revalidateError) {
      toast.error(
        revalidateError instanceof Error ? revalidateError.message : 'Revalidation request failed',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
      disabled={pending}
      onClick={() => void revalidate()}
      title={
        withTitle
          ? 'Re-check every unresolved conversion issue and resolve the ones that no longer hold'
          : undefined
      }
    >
      <ListChecks className={`h-3 w-3 ${pending ? 'animate-pulse' : ''}`} />
      Revalidate issues
    </Button>
  );
}

/* Adjudicate: deterministic duplicate-pair merges sourced from unresolved
   duplicate_stub issues. Two-step by design — this button only ever runs a
   dry run; committing is an explicit confirm inside the summary dialog. Dry
   runs execute the full merge in a transaction and roll back, so every count
   shown is real. */
function AdjudicateDuplicatesButton() {
  const [pending, setPending] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [confirmingCommit, setConfirmingCommit] = useState(false);
  const [summary, setSummary] = useState<StubDuplicateAdjudicationSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const runDry = async () => {
    setPending(true);
    try {
      const next = await apiService.adjudicateInternalDuplicates(true);
      setSummary(next);
      setConfirmingCommit(false);
      setDialogOpen(true);
    } catch (adjudicateError) {
      toast.error(
        adjudicateError instanceof Error ? adjudicateError.message : 'Adjudication dry run failed',
      );
    } finally {
      setPending(false);
    }
  };

  const commit = async () => {
    setCommitting(true);
    try {
      const next = await apiService.adjudicateInternalDuplicates(false);
      setSummary(next);
      setConfirmingCommit(false);
      toast.success(`Merged ${next.merged} pair${next.merged === 1 ? '' : 's'}`, {
        description: `${next.pairsConsidered} considered · ${next.skipped} skipped`,
      });
    } catch (commitError) {
      toast.error(commitError instanceof Error ? commitError.message : 'Merge commit failed');
    } finally {
      setCommitting(false);
    }
  };

  const mergeLabel = summary
    ? `${summary.merged} pair${summary.merged === 1 ? '' : 's'}`
    : '';

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        disabled={pending}
        onClick={() => void runDry()}
      >
        <GitMerge className={`h-3 w-3 ${pending ? 'animate-pulse' : ''}`} />
        {pending ? 'Dry run…' : 'Adjudicate duplicates'}
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setConfirmingCommit(false);
        }}
      >
        <DialogContent className="domain-eng sm:max-w-lg">
          {summary && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">
                  Duplicate adjudication · {summary.dryRun ? 'dry run' : 'committed'}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {summary.dryRun
                    ? 'The full merge executed in a transaction and rolled back — these counts are real, and nothing has changed.'
                    : 'Merges are committed: each loser’s references were re-pointed to its survivor and the loser row was deleted.'}
                </DialogDescription>
              </DialogHeader>

              <StatStrip>
                <Stat label="Pairs considered" value={summary.pairsConsidered} />
                <Stat
                  label="Merged"
                  value={summary.merged}
                  tone={summary.merged ? 'success' : 'neutral'}
                />
                <Stat
                  label="Skipped"
                  value={summary.skipped}
                  tone={summary.skipped ? 'warning' : 'neutral'}
                />
              </StatStrip>

              {summary.outcomes.length > 0 && (
                <div className="max-h-[320px] divide-y divide-border/60 overflow-y-auto rounded-lg border border-border">
                  {summary.outcomes.map((outcome, index) => (
                    <div
                      key={`${outcome.entityType}-${outcome.survivorId}-${outcome.loserId}-${index}`}
                      className="space-y-1 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill
                          tone={outcome.action === 'merged' ? 'success' : 'warning'}
                          label={outcome.action}
                        />
                        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {outcome.entityType}
                        </span>
                      </div>
                      <div className="break-all font-mono text-[10px] tabular-nums">
                        <p className="text-foreground">survivor · {outcome.survivorId}</p>
                        <p className="text-muted-foreground">loser · {outcome.loserId}</p>
                      </div>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        {outcome.action === 'skipped' && outcome.skipReason
                          ? outcome.skipReason
                          : outcome.survivorReason}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] leading-snug text-muted-foreground">
                Survivor rule: post-referenced first, then most platform data, then most
                playlist/user references, then the older row.
              </p>

              {summary.dryRun && summary.merged > 0 && (
                <DialogFooter className="sm:justify-start">
                  {confirmingCommit ? (
                    <div className="w-full space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <p className="text-xs text-foreground">
                        Re-run with dryRun: false? This re-points every loser reference to its
                        survivor and deletes the loser rows ({mergeLabel} in this dry run). It
                        cannot be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={committing}
                          onClick={() => void commit()}
                        >
                          {committing ? 'Merging…' : 'Confirm merge'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={committing}
                          onClick={() => setConfirmingCommit(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setConfirmingCommit(true)}
                    >
                      Apply merges…
                    </Button>
                  )}
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* One maintenance control: a quiet button, a one-line caption beneath it, and
   a hover tooltip carrying the operational fine print. Keeps the fact sheet
   available without an explainer card. */
function MaintenanceAction({
  caption,
  details,
  children,
}: {
  caption: string;
  details: string[];
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex max-w-[240px] flex-col items-start gap-0.5">
          {children}
          <p className="pl-2 text-[10px] leading-snug text-muted-foreground">{caption}</p>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start" className="max-w-[320px]">
        <ul className="list-disc space-y-1 pl-3.5 text-left text-[11px] leading-snug">
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

/* Cause annotations are keyed by invariant id; one fetch serves both the
   findings sheet (read) and the invariant sheet (read/write). */
function useInvariantNotes() {
  const [notes, setNotes] = useState<Record<string, InternalSentinelInvariantNote>>({});

  const loadNotes = useCallback(async () => {
    try {
      const response = await apiService.getInternalSentinelInvariantNotes();
      setNotes(Object.fromEntries(response.items.map((note) => [note.invariantId, note])));
    } catch {
      // Notes are contextual enrichment; the findings themselves still load.
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  return { notes, reloadNotes: loadNotes };
}

/* Read-only rendering of an invariant's cause annotation. Shown with the
   invariant's findings; it explains them and never restyles or hides them. */
function InvariantNoteFields({ note }: { note: InternalSentinelInvariantNote }) {
  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
      {note.rootCauseSummary && (
        <Field label="Root cause">
          <span className="break-words text-muted-foreground">{note.rootCauseSummary}</span>
        </Field>
      )}
      {note.fixedInReference && (
        <Field label="Fixed in">
          <span className="break-all font-mono tabular-nums">{note.fixedInReference}</span>
        </Field>
      )}
      {note.regressionTestReference && (
        <Field label="Regression test">
          <span className="break-all font-mono tabular-nums">{note.regressionTestReference}</span>
        </Field>
      )}
      {note.residueNote && (
        <Field label="Residue">
          <span className="break-words text-muted-foreground">{note.residueNote}</span>
        </Field>
      )}
      <Field label="Annotated">
        <span className="text-muted-foreground">
          {note.updatedBy} · {formatDate(note.updatedAtUtc)}
        </span>
      </Field>
    </div>
  );
}

function SentinelFindingsPanel() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState(ALL_FILTER);
  const [invariantId, setInvariantId] = useState(ALL_FILTER);
  const [status, setStatus] = useState<FindingStatus>('active');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<InternalSentinelFindingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { notes } = useInvariantNotes();

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiService.getInternalSentinelFindings({
        q: debouncedSearch || undefined,
        severity: severity === ALL_FILTER ? undefined : severity,
        invariantId: invariantId === ALL_FILTER ? undefined : invariantId,
        status,
        page,
        pageSize: PAGE_SIZE,
      });
      setResponse(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load Sentinel findings');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, severity, invariantId, status, page]);

  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);

  const findings = response?.items ?? [];
  const total = response?.totalItems ?? 0;
  const statusCounts = response?.statusCounts ?? {};
  const selectedFinding = findings.find((finding) => finding.fingerprint === selectedFingerprint) ?? null;
  const invariantOptions = Array.from(new Set([
    ...findings.map((finding) => finding.invariantId),
    ...(invariantId === ALL_FILTER ? [] : [invariantId]),
  ])).sort();

  const activeCount = response ? statusCounts.active ?? 0 : undefined;
  const statusOptions = FINDING_STATUS_OPTIONS.map((option) => ({
    value: option.value,
    label: option.value === 'active' && typeof activeCount === 'number'
      ? `${option.label} · ${activeCount}`
      : option.label,
  }));

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

  const handleStatusChange = (value: FindingStatus) => {
    setStatus(value);
    setPage(1);
  };

  const openFinding = (finding: InternalSentinelFinding) => {
    setSelectedFingerprint(finding.fingerprint);
    setSheetOpen(true);
  };

  const columns: Column<InternalSentinelFinding>[] = [
    {
      key: 'finding',
      header: 'Finding',
      valign: 'top',
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={severityTone(row.severity)} label={row.severity} />
            <RecurrenceBadge count={row.recurrenceCount} />
          </div>
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
    <>
    <Panel
      title={total > 0 ? `Findings · ${total}` : 'Findings'}
      actions={
        <div className="flex items-center gap-1">
          <CopyCoordinatorPromptButton />
          <RefreshButton loading={loading} onClick={() => void loadFindings()} />
        </div>
      }
    >
      {/* Maintenance strip: the three operational levers, each with a one-line
          caption and a hover tooltip for the fine print. Quiet on purpose. */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2 border-b border-border px-3 py-2">
        <MaintenanceAction
          caption="Async full audit — results land in ~30–90 s."
          details={[
            'Publishes an audit.requested message; the Sentinel worker runs it as a full-scope audit.',
            'Asynchronous: the run appears under Runs in ~30–90 s — longer if the queue is busy.',
            'Only full-scope runs resolve findings the scan no longer sees.',
            'If a conversion-triggered audit is mid-write, the first attempt can retry after the ~5 min visibility timeout. That is normal.',
          ]}
        >
          <RescanButton withTitle={false} />
        </MaintenanceAction>
        <MaintenanceAction
          caption="Resolves stale conversion issues — never findings."
          details={[
            'Re-checks every unresolved conversion issue against its original trigger condition and resolves the ones that verifiably no longer hold.',
            'Covers duplicate_stub, invalid_track_number, multiple_primary_artists, and duplicate_platform_id.',
            'Never deletes rows and never mutates domain data.',
            'Does not resolve Sentinel findings — a full rescan does that.',
          ]}
        >
          <RevalidateIssuesButton withTitle={false} />
        </MaintenanceAction>
        <MaintenanceAction
          caption="Dry run first — committing is a separate confirm."
          details={[
            'Deterministically merges duplicate pairs from unresolved duplicate_stub issues.',
            'Survivor rule: post-referenced, then most platform data, then most playlist/user references, then the older row.',
            'The dry run executes the full merge in a transaction and rolls back, so the reported counts are real.',
            'Nothing commits until you confirm the second step in the results dialog.',
          ]}
        >
          <AdjudicateDuplicatesButton />
        </MaintenanceAction>
      </div>

      <div className="space-y-2 border-b border-border px-3 py-2">
        <SegmentedControl<FindingStatus>
          value={status}
          onChange={handleStatusChange}
          options={statusOptions}
        />
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
        onRowClick={openFinding}
        selectedKey={sheetOpen ? selectedFingerprint : null}
        isLoading={loading && !findings.length}
        empty={{
          icon: Database,
          title: 'No findings',
          description: 'No Sentinel findings match these filters.',
        }}
        renderMobile={(row) => (
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <StatusPill tone={severityTone(row.severity)} label={row.severity} />
                <RecurrenceBadge count={row.recurrenceCount} />
              </span>
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

    <SentinelFindingDetailSheet
      finding={selectedFinding}
      note={selectedFinding ? notes[selectedFinding.invariantId] ?? null : null}
      open={sheetOpen}
      onOpenChange={setSheetOpen}
    />
    </>
  );
}

/* ─────────────────────── Finding detail sheet ──────────────────────────────
   Read-only: status, recurrence context, entity, and evidence. There is no
   status action here by design — resolution is machine-earned by a Sentinel
   scan; the only lever is a quiet per-invariant rescan. The invariant's cause
   annotation (if any) is shown alongside so the finding is explained without
   ever being hidden or restyled. */

function SentinelFindingDetailSheet({
  finding,
  note,
  open,
  onOpenChange,
}: {
  finding: InternalSentinelFinding | null;
  note: InternalSentinelInvariantNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="domain-eng flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {finding && (
          <>
            <SheetHeader className="gap-3 border-b border-border bg-muted/20 p-4 pr-12">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={severityTone(finding.severity)} label={finding.severity} />
                  <StatusPill tone={findingStatusTone(finding.status)} label={finding.status} />
                  <RecurrenceBadge count={finding.recurrenceCount} />
                </div>
                <span className="text-[10px] text-muted-foreground">{formatDate(finding.lastSeenAtUtc)}</span>
              </div>
              <div className="space-y-0.5">
                <SheetTitle className="text-sm">{finding.summary}</SheetTitle>
                <SheetDescription className="sr-only">Sentinel finding detail</SheetDescription>
                <p className="font-mono text-[11px] text-muted-foreground">{finding.invariantId}</p>
              </div>
              <IdField label="Fingerprint" value={finding.fingerprint} />
              <div>
                <CopyFindingPromptButton finding={finding} note={note} />
              </div>
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-4">
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Lifecycle
                    </h3>
                    <RescanButton invariantId={finding.invariantId} label="Rescan invariant" />
                  </div>
                  <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
                    <Field label="Status">
                      <StatusPill tone={findingStatusTone(finding.status)} label={finding.status} />
                    </Field>
                    {finding.recurrenceCount > 0 && (
                      <Field label="Recurred">
                        <span className="font-mono tabular-nums text-destructive">
                          ×{finding.recurrenceCount}
                          {finding.lastReactivatedAtUtc
                            ? ` · last ${formatDate(finding.lastReactivatedAtUtc)}`
                            : ''}
                        </span>
                      </Field>
                    )}
                    {finding.resolvedByRunId && finding.resolvedAtUtc && (
                      <Field label="Resolved">
                        <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <span>{formatDate(finding.resolvedAtUtc)}</span>
                          <CopyId value={finding.resolvedByRunId} label="Resolving run" />
                        </span>
                      </Field>
                    )}
                    <Field label="First seen">{formatDate(finding.firstSeenAtUtc)}</Field>
                    <Field label="Occurrences">
                      <span className="font-mono tabular-nums">{finding.occurrenceCount}</span>
                    </Field>
                  </div>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    Status is machine-owned: a scan that re-checks this invariant&apos;s full scope
                    resolves what it no longer sees, and re-emission reactivates it.
                  </p>
                </section>

                {note && (
                  <section className="space-y-2.5">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Cause annotation · {finding.invariantId}
                    </h3>
                    <InvariantNoteFields note={note} />
                  </section>
                )}

                <section className="space-y-2.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Entity
                  </h3>
                  <div className="divide-y divide-border/60 rounded-lg border border-border bg-card/40 px-3">
                    <Field label="Type">{finding.entityType}</Field>
                    <Field label="Id">
                      <CopyId value={finding.entityId} label="Entity ID" />
                    </Field>
                    <Field label="Last run">
                      <CopyId value={finding.lastRunId} label="Run ID" />
                    </Field>
                  </div>
                </section>

                <section className="space-y-2.5">
                  <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Evidence
                  </h3>
                  <div className="rounded-lg border border-border bg-card/40 px-3 py-1">
                    <EvidenceList evidence={finding.evidence} />
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
            {row.runScope && (
              <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground/70">
                {row.runScope}
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
                    <Field label="Scope">{run.runScope || '—'}</Field>
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
  const [selectedInvariant, setSelectedInvariant] = useState<InternalSentinelInvariantRegistryItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { notes, reloadNotes } = useInvariantNotes();

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
          {notes[row.invariantId] && (
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">annotated</p>
          )}
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

  const openInvariant = (row: InternalSentinelInvariantRegistryItem) => {
    setSelectedInvariant(row);
    setSheetOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        {scopeGroups.map(([scope, items], index) => (
          <Panel
            key={scope}
            title={`${scope} · ${items.length}`}
            actions={
              index === 0 ? (
                <div className="flex items-center gap-1">
                  <RescanButton label="Rescan all" />
                  <RefreshButton loading={loading} onClick={() => void loadRegistry()} />
                </div>
              ) : undefined
            }
          >
            <DataTable<InternalSentinelInvariantRegistryItem>
              columns={columns}
              rows={items}
              rowKey={(row) => row.invariantId}
              onRowClick={openInvariant}
              selectedKey={sheetOpen ? selectedInvariant?.invariantId ?? null : null}
              renderMobile={renderMobile}
            />
          </Panel>
        ))}
      </div>

      <SentinelInvariantDetailSheet
        invariant={selectedInvariant}
        note={selectedInvariant ? notes[selectedInvariant.invariantId] ?? null : null}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onNoteChanged={() => void reloadNotes()}
      />
    </>
  );
}

/* ───────────────────── Invariant detail sheet ──────────────────────────────
   The write surface for the human layer: the per-invariant cause annotation
   (root cause, fixed-in, regression test, deliberate residue) plus a quiet
   single-invariant rescan. Nothing here touches finding status. */
function SentinelInvariantDetailSheet({
  invariant,
  note,
  open,
  onOpenChange,
  onNoteChanged,
}: {
  invariant: InternalSentinelInvariantRegistryItem | null;
  note: InternalSentinelInvariantNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rootCauseSummary, setRootCauseSummary] = useState('');
  const [fixedInReference, setFixedInReference] = useState('');
  const [regressionTestReference, setRegressionTestReference] = useState('');
  const [residueNote, setResidueNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever a different invariant (or fresh note) opens.
  useEffect(() => {
    setEditing(false);
    setRootCauseSummary(note?.rootCauseSummary ?? '');
    setFixedInReference(note?.fixedInReference ?? '');
    setRegressionTestReference(note?.regressionTestReference ?? '');
    setResidueNote(note?.residueNote ?? '');
  }, [invariant?.invariantId, note]);

  const save = async () => {
    if (!invariant) return;
    setSaving(true);
    try {
      const saved = await apiService.saveInternalSentinelInvariantNote(invariant.invariantId, {
        rootCauseSummary: rootCauseSummary.trim() || null,
        fixedInReference: fixedInReference.trim() || null,
        regressionTestReference: regressionTestReference.trim() || null,
        residueNote: residueNote.trim() || null,
      });
      toast.success(saved ? 'Annotation saved' : 'Annotation removed');
      setEditing(false);
      onNoteChanged();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'Failed to save annotation');
    } finally {
      setSaving(false);
    }
  };

  const noteField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    rows: number,
  ) => (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-domain"
      />
    </label>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="domain-eng flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        {invariant && (
          <>
            <SheetHeader className="gap-3 border-b border-border bg-muted/20 p-4 pr-12">
              <div className="flex items-center justify-between gap-2">
                <StatusPill
                  tone={statusTone(invariant.latestMaxSeverity ?? invariant.latestStatus)}
                  label={`${invariant.latestFindingCount} finding${invariant.latestFindingCount === 1 ? '' : 's'}`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(invariant.latestEvaluatedAtUtc)}
                </span>
              </div>
              <div className="space-y-0.5">
                <SheetTitle className="text-sm">{invariant.invariantName}</SheetTitle>
                <SheetDescription className="sr-only">Sentinel invariant detail</SheetDescription>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {invariant.invariantDescription}
                </p>
              </div>
              <IdField label="Invariant" value={invariant.invariantId} />
            </SheetHeader>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-5 p-4">
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Scan
                    </h3>
                    <RescanButton invariantId={invariant.invariantId} />
                  </div>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    A single-invariant rescan re-checks this invariant&apos;s full scope; findings
                    it no longer sees resolve, and anything re-emitted stays (or returns to) active.
                  </p>
                </section>

                <section className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Cause annotation
                    </h3>
                    {!editing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setEditing(true)}
                      >
                        {note ? 'Edit' : 'Add note'}
                      </Button>
                    )}
                  </div>

                  {!editing && note && <InvariantNoteFields note={note} />}
                  {!editing && !note && (
                    <p className="text-[11px] text-muted-foreground">
                      No annotation yet. Use it to record the root cause, the fixing commit/PR,
                      the regression test, or why remaining findings are deliberate residue.
                      Annotations explain findings — they never hide them.
                    </p>
                  )}

                  {editing && (
                    <div className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
                      {noteField('Root cause', rootCauseSummary, setRootCauseSummary, 2)}
                      {noteField('Fixed in (commit / PR)', fixedInReference, setFixedInReference, 1)}
                      {noteField('Regression test', regressionTestReference, setRegressionTestReference, 1)}
                      {noteField('Deliberate residue', residueNote, setResidueNote, 2)}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={saving}
                          onClick={() => void save()}
                        >
                          Save annotation
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={saving}
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Saving with every field blank removes the annotation.
                      </p>
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
