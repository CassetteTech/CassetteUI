'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiService } from '@/services/api';
import type {
  InternalConversionQualityMetrics,
  InternalConversionQualityRate,
  InternalConversionQualityTrendResponse,
} from '@/types';
import { cn } from '@/lib/utils';
import { ErrorState } from './error-state';
import { Panel, SectionHeader, Stat, StatStrip } from './kit/primitives';

const WINDOWS = [7, 30, 90] as const;

function percent(rate: InternalConversionQualityRate): string {
  return rate.value == null ? 'n/a' : `${(rate.value * 100).toFixed(1)}%`;
}

function sample(rate: InternalConversionQualityRate): string {
  if (rate.numerator == null || rate.denominator == null) return 'No eligible sample';
  const interval = rate.wilsonLow95 == null || rate.wilsonHigh95 == null
    ? ''
    : ` · 95% ${(rate.wilsonLow95 * 100).toFixed(1)}–${(rate.wilsonHigh95 * 100).toFixed(1)}%`;
  return `${rate.numerator}/${rate.denominator}${interval}`;
}

function MetricReadout({ label, rate }: { label: string; rate: InternalConversionQualityRate }) {
  return (
    <div className="min-w-0 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{percent(rate)}</p>
      <p className="text-[10px] text-muted-foreground">{sample(rate)}</p>
    </div>
  );
}

function MetricGrid({ metrics, labeled }: { metrics: InternalConversionQualityMetrics; labeled: boolean }) {
  const entries = labeled
    ? [
        ['Decision accuracy', metrics.decisionAccuracy],
        ['Successful target', metrics.successfulTargetMatchRate],
        ['Wrong match', metrics.wrongMatchRate],
        ['False positive', metrics.falsePositiveAcceptanceRate],
        ['Expected-match miss', metrics.expectedMatchMissRate],
      ] as const
    : [
        ['Acceptance', metrics.targetMatchAcceptanceRate],
        ['No match', metrics.noMatchRate],
        ['No candidate', metrics.noCandidateRate],
        ['Low confidence', metrics.lowConfidenceRejectionRate],
        ['Ambiguous', metrics.ambiguousMatchRate],
        ['Operational', metrics.operationalFailureRate],
      ] as const;
  return (
    <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {entries.map(([label, rate]) => <MetricReadout key={label} label={label} rate={rate} />)}
    </div>
  );
}

function DailyBars({ report }: { report: InternalConversionQualityTrendResponse }) {
  const active = report.daily.filter(point =>
    point.unlabeled.qualityOpportunities + point.unlabeled.operationalFailures > 0
  );
  if (active.length === 0) {
    return <p className="px-3 py-8 text-center text-xs text-muted-foreground">No version-4 decisions in this window.</p>;
  }
  return (
    <div className="divide-y divide-border">
      {active.map(point => {
        const acceptance = (point.unlabeled.targetMatchAcceptanceRate.value ?? 0) * 100;
        const operational = (point.unlabeled.operationalFailureRate.value ?? 0) * 100;
        return (
          <div key={point.date} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 px-3 py-2">
            <span className="font-mono text-[10px] text-muted-foreground">{point.date}</span>
            <div className="space-y-1" aria-label={`${point.date} acceptance ${acceptance.toFixed(1)} percent`}>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-domain" style={{ width: `${acceptance}%` }} />
              </div>
              {operational > 0 && (
                <div className="h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-destructive" style={{ width: `${operational}%` }} />
                </div>
              )}
            </div>
            <span className="font-mono text-[10px] tabular-nums text-foreground">
              {point.unlabeled.accepted}/{point.unlabeled.qualityOpportunities}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ConversionQualityTrends() {
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(30);
  const [report, setReport] = useState<InternalConversionQualityTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await apiService.getInternalConversionQualityTrends({ days }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load conversion quality trends');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <SectionHeader
        section="Engineering"
        title="Conversion Quality"
        count={report?.deduplicatedDecisionCount}
        actions={(
          <div className="flex items-center gap-1">
            {WINDOWS.map(window => (
              <Button
                key={window}
                size="sm"
                variant={days === window ? 'secondary' : 'ghost'}
                className="h-7 px-2 font-mono text-[10px]"
                onClick={() => setDays(window)}
              >
                {window}d
              </Button>
            ))}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        )}
      />

      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {!error && loading && !report && <p className="py-12 text-center text-xs text-muted-foreground">Loading quality cohorts…</p>}
      {report && (
        <>
          {(report.sourceRowsTruncated || report.adjudicationRowsTruncated) && (
            <p className="rounded-md border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/10 px-3 py-2 text-xs text-[hsl(var(--warning-text))]">
              A report safety limit was reached. Narrow the time window before interpreting this report.
            </p>
          )}

          <StatStrip>
            <Stat label="Quality opportunities" value={report.productionUnlabeled.qualityOpportunities} />
            <Stat label="Accepted" value={report.productionUnlabeled.accepted} tone="success" />
            <Stat label="Quality rejections" value={report.productionUnlabeled.qualityRejections} tone="warning" />
            <Stat label="Operational" value={report.productionUnlabeled.operationalFailures} tone="critical" />
            <Stat label="Adjudicated" value={report.productionAdjudicated.adjudicatedOpportunities} hint="correctness sample" />
          </StatStrip>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Production · unlabeled coverage" bodyClassName="overflow-hidden">
              <MetricGrid metrics={report.productionUnlabeled} labeled={false} />
              <p className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                Acceptance is coverage, not proof that the selected provider ID is correct.
              </p>
            </Panel>
            <Panel title="Production · verified adjudications" bodyClassName="overflow-hidden">
              <MetricGrid metrics={report.productionAdjudicated} labeled />
              <p className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                Only completed reviews linked to a durable decision enter this cohort.
              </p>
            </Panel>
          </div>

          <Panel title="Daily acceptance coverage" bodyClassName="overflow-hidden">
            <DailyBars report={report} />
          </Panel>

          <Panel title="Version cohorts" bodyClassName="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Scorer / policy / configuration</th>
                  <th className="px-3 py-2 font-medium">Sample</th>
                  <th className="px-3 py-2 font-medium">Acceptance</th>
                  <th className="px-3 py-2 font-medium">Operational</th>
                  <th className="px-3 py-2 font-medium">Adjudicated</th>
                  <th className="px-3 py-2 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.versionCohorts.map(cohort => (
                  <tr key={`${cohort.scorerVersion}:${cohort.policyVersion}:${cohort.configurationVersion}`}>
                    <td className="px-3 py-2 font-mono text-[10px]">
                      {cohort.scorerVersion}<br />{cohort.policyVersion}<br />{cohort.configurationVersion}
                    </td>
                    <td className="px-3 py-2 tabular-nums">{cohort.unlabeled.qualityOpportunities}</td>
                    <td className="px-3 py-2 tabular-nums">{percent(cohort.unlabeled.targetMatchAcceptanceRate)}</td>
                    <td className="px-3 py-2 tabular-nums">{percent(cohort.unlabeled.operationalFailureRate)}</td>
                    <td className="px-3 py-2 tabular-nums">{cohort.adjudicated.adjudicatedOpportunities}</td>
                    <td className="px-3 py-2 tabular-nums">{percent(cohort.adjudicated.decisionAccuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <Panel title="Offline deterministic baseline" bodyClassName="p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Dataset {report.offlineBaseline.datasetVersion} · {report.offlineBaseline.policyVersion}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Fixed candidates: {report.offlineBaseline.passed}/{report.offlineBaseline.cases} decisions pass.
                  This is a regression baseline, not a production trend point.
                </p>
                <p className="mt-2 font-mono text-[9px] text-muted-foreground">
                  {report.offlineBaseline.datasetDigestSha256}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <MetricReadout label="Decision accuracy" rate={report.offlineBaseline.decisionAccuracy} />
                <MetricReadout label="Wrong match" rate={report.offlineBaseline.wrongMatchRate} />
              </div>
            </div>
          </Panel>

          <Panel title={`Breakdowns · metric contract ${report.metricContract}`} bodyClassName="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-2">Dimension</th><th className="px-3 py-2">Value</th><th className="px-3 py-2">Q</th><th className="px-3 py-2">Acceptance</th><th className="px-3 py-2">Accuracy</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {report.dimensions.map(row => (
                  <tr key={`${row.dimension}:${row.key}`}>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{row.dimension}</td>
                    <td className="px-3 py-2 font-mono text-[10px]">{row.key}</td>
                    <td className="px-3 py-2 tabular-nums">{row.unlabeled.qualityOpportunities}</td>
                    <td className="px-3 py-2 tabular-nums">{percent(row.unlabeled.targetMatchAcceptanceRate)}</td>
                    <td className="px-3 py-2 tabular-nums">{percent(row.adjudicated.decisionAccuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          <ul className="space-y-1 text-[10px] text-muted-foreground">
            {report.caveats.map(caveat => <li key={caveat}>• {caveat}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}
