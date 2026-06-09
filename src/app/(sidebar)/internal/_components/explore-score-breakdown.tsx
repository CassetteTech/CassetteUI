'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InternalExploreSnapshotItem } from '@/types';
import {
  barWidthPercent,
  formatDebugValue,
  formatScore,
  hasPlaylistFamily,
  maxAbsValue,
  scoreEntries,
} from './explore-snapshot-utils';

interface ExploreScoreBreakdownProps {
  item: InternalExploreSnapshotItem;
}

type BarTone = 'component' | 'boost' | 'penalty';

const TONE_BAR_CLASS: Record<BarTone, string> = {
  component: 'bg-[hsl(var(--info))]',
  boost: 'bg-[hsl(var(--success))]',
  penalty: 'bg-destructive',
};

const TONE_VALUE_CLASS: Record<BarTone, string> = {
  component: 'text-foreground',
  boost: 'text-[hsl(var(--success))]',
  penalty: 'text-destructive',
};

function BarRow({ label, value, tone, scale }: { label: string; value: number; tone: BarTone; scale: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-44 shrink-0 truncate font-mono text-[11px] text-muted-foreground" title={label}>
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded bg-muted/50">
        <div className={`h-full rounded ${TONE_BAR_CLASS[tone]}`} style={{ width: `${barWidthPercent(value, scale)}%` }} />
      </div>
      <span className={`w-16 shrink-0 text-right font-mono text-[11px] tabular-nums ${TONE_VALUE_CLASS[tone]}`}>
        {formatScore(value)}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function KeyValueList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (!entries.length) {
    return <p className="text-[11px] text-muted-foreground">None</p>;
  }
  return (
    <div className="grid gap-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{key}</span>
          <span className="break-all font-mono text-[11px]">{formatDebugValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ExploreScoreBreakdown({ item }: ExploreScoreBreakdownProps) {
  const [showRawJson, setShowRawJson] = useState(false);

  // Scale every bar against the largest magnitude across all three maps so they're directly comparable.
  const scale = useMemo(
    () => maxAbsValue(item.scoreComponents, item.boosts, item.penalties) || 1,
    [item.scoreComponents, item.boosts, item.penalties]
  );

  const components = scoreEntries(item.scoreComponents);
  const boosts = scoreEntries(item.boosts);
  const penalties = scoreEntries(item.penalties);

  const rawJson = useMemo(
    () =>
      JSON.stringify(
        {
          scoreComponents: item.scoreComponents,
          boosts: item.boosts,
          penalties: item.penalties,
          constraintNotes: item.constraintNotes ?? {},
          candidateSources: item.candidateSources ?? {},
        },
        null,
        2
      ),
    [item]
  );

  return (
    <div className="grid gap-5 rounded-lg border bg-muted/20 p-4 lg:grid-cols-2">
      {/* Left column: scores as bars */}
      <div className="space-y-4">
        <Section title={`Score components (${components.length})`}>
          {components.length ? (
            <div className="space-y-1">
              {components.map(([label, value]) => (
                <BarRow key={label} label={label} value={value} tone="component" scale={scale} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">None</p>
          )}
        </Section>

        {boosts.length > 0 && (
          <Section title={`Boosts (${boosts.length})`}>
            <div className="space-y-1">
              {boosts.map(([label, value]) => (
                <BarRow key={label} label={label} value={value} tone="boost" scale={scale} />
              ))}
            </div>
          </Section>
        )}

        <Section title={`Penalties (${penalties.length})`}>
          {penalties.length ? (
            <div className="space-y-1">
              {penalties.map(([label, value]) => (
                <BarRow key={label} label={label} value={value} tone="penalty" scale={scale} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">None</p>
          )}
        </Section>
      </div>

      {/* Right column: debug metadata */}
      <div className="space-y-4">
        <Section title="Constraint notes">
          <KeyValueList data={item.constraintNotes ?? {}} />
        </Section>

        <Section title="Candidate sources">
          <KeyValueList data={item.candidateSources ?? {}} />
        </Section>

        {hasPlaylistFamily(item) && (
          <Section title="Playlist family">
            <KeyValueList
              data={{
                familyKey: item.playlistFamilyKey,
                normalizedTitle: item.playlistTitleNormalized,
                confidence: item.playlistFamilyConfidence,
                reason: item.playlistFamilyReason,
                isGeneric: item.isGenericPlaylistFamily,
              }}
            />
          </Section>
        )}

        <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-between gap-2 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-1.5">
                <Code className="h-3 w-3" />
                Raw JSON
              </div>
              <ChevronDown className={`h-3 w-3 transition-transform ${showRawJson ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="mt-1.5 max-h-[280px]">
              <pre className="whitespace-pre-wrap break-all rounded-lg border bg-muted/30 p-3 text-[11px] font-mono leading-relaxed">
                {rawJson}
              </pre>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
