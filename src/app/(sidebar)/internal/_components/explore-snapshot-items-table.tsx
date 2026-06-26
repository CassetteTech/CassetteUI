'use client';

import { Fragment, useState } from 'react';
import { ChevronRight, ListMusic } from 'lucide-react';
import type { InternalExploreSnapshotItem } from '@/types';
import { formatDate } from './internal-utils';
import { formatScore } from './explore-snapshot-utils';
import { ExploreScoreBreakdown } from './explore-score-breakdown';
import { StatusPill, type Tone } from './kit';

interface ExploreSnapshotItemsTableProps {
  items: InternalExploreSnapshotItem[];
  isLoading: boolean;
}

const COLUMN_COUNT = 12;

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/60">
          <td colSpan={COLUMN_COUNT} className="px-3 py-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted/50" />
          </td>
        </tr>
      ))}
    </>
  );
}

function availabilityTone(isAvailable: boolean): Tone {
  return isAvailable ? 'success' : 'critical';
}

export function ExploreSnapshotItemsTable({ items, isLoading }: ExploreSnapshotItemsTableProps) {
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const toggle = (rank: number) => setExpandedRank((current) => (current === rank ? null : rank));

  if (!isLoading && !items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
        <ListMusic className="h-5 w-5 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">No ranked items</p>
        <p className="text-xs text-muted-foreground">This snapshot has no stored items to inspect.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full border-collapse lg:table">
        <thead>
          <tr className="border-b border-border">
            <th className="w-7 px-3 py-2" />
            <th className="w-10 px-3 py-2 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">#</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Type</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Title</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Creator</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avail</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden 2xl:table-cell">Post ID</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden 2xl:table-cell">Music ID</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Created</th>
            <th className="px-3 py-2 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Raw</th>
            <th className="px-3 py-2 text-right font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Final</th>
            <th className="px-3 py-2 text-left font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Reason</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeletonRows />
          ) : (
            items.map((item) => {
              const isExpanded = expandedRank === item.rank;
              return (
                <Fragment key={item.rank}>
                  <tr
                    className={`border-b border-border/60 cursor-pointer transition-colors ${
                      isExpanded ? 'bg-domain/[0.05]' : 'hover:bg-muted/40'
                    }`}
                    onClick={() => toggle(item.rank)}
                  >
                    <td className="px-3 py-2 align-middle">
                      <ChevronRight
                        className={`h-3 w-3 text-muted-foreground transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right align-middle font-mono text-xs tabular-nums text-muted-foreground">
                      {item.rank}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <StatusPill tone="neutral" label={item.elementType} dot={false} />
                    </td>
                    <td className="px-3 py-2 align-middle max-w-[200px]">
                      <div className="truncate text-xs font-medium text-foreground" title={item.title ?? undefined}>
                        {item.title || <span className="text-muted-foreground">Untitled</span>}
                      </div>
                      {item.subtitle && (
                        <div className="truncate text-[11px] text-muted-foreground" title={item.subtitle}>
                          {item.subtitle}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle text-xs text-foreground hidden xl:table-cell">
                      {item.creatorUsername || <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <StatusPill
                        tone={availabilityTone(item.isAvailable)}
                        label={item.availability}
                        dot={false}
                      />
                    </td>
                    <td className="px-3 py-2 align-middle hidden 2xl:table-cell">
                      <span className="block max-w-[120px] truncate font-mono text-[11px] tabular-nums text-muted-foreground" title={item.postId}>
                        {item.postId}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle hidden 2xl:table-cell">
                      <span className="block max-w-[120px] truncate font-mono text-[11px] tabular-nums text-muted-foreground" title={item.musicElementId}>
                        {item.musicElementId}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle whitespace-nowrap text-[11px] text-muted-foreground hidden xl:table-cell">
                      {formatDate(item.createdAtUtc)}
                    </td>
                    <td className="px-3 py-2 align-middle text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {formatScore(item.rawScore)}
                    </td>
                    <td className="px-3 py-2 align-middle text-right font-mono text-xs tabular-nums font-semibold text-foreground">
                      {formatScore(item.finalScore)}
                    </td>
                    <td className="px-3 py-2 align-middle max-w-[160px] hidden xl:table-cell">
                      <span className="block truncate text-[11px] text-muted-foreground" title={item.rankReason}>
                        {item.rankReason || '—'}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="hover:bg-transparent">
                      <td colSpan={COLUMN_COUNT} className="bg-muted/[0.04] p-3">
                        <ExploreScoreBreakdown item={item} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>

      {/* Mobile list */}
      <div className="divide-y divide-border lg:hidden">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-3 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))
        ) : (
          items.map((item) => {
            const isExpanded = expandedRank === item.rank;
            return (
              <div key={item.rank}>
                <button
                  type="button"
                  onClick={() => toggle(item.rank)}
                  className={`w-full px-3 py-2.5 text-left transition-colors ${
                    isExpanded ? 'bg-domain/[0.05]' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground w-6 shrink-0">{item.rank}</span>
                      <span className="truncate text-xs font-medium text-foreground">
                        {item.title || <span className="text-muted-foreground">Untitled</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs tabular-nums font-semibold text-foreground">
                        {formatScore(item.finalScore)}
                      </span>
                      <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 pl-8">
                    <StatusPill tone="neutral" label={item.elementType} dot={false} />
                    <StatusPill tone={availabilityTone(item.isAvailable)} label={item.availability} dot={false} />
                    {item.creatorUsername && (
                      <span className="text-[11px] text-muted-foreground">{item.creatorUsername}</span>
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="bg-muted/[0.04] px-3 py-2.5">
                    <ExploreScoreBreakdown item={item} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
