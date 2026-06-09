'use client';

import { Fragment, useState } from 'react';
import { ChevronRight, ListMusic } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { InternalExploreSnapshotItem } from '@/types';
import { formatDate } from './internal-utils';
import { formatScore } from './explore-snapshot-utils';
import { ExploreScoreBreakdown } from './explore-score-breakdown';
import { EmptyState } from './empty-state';

interface ExploreSnapshotItemsTableProps {
  items: InternalExploreSnapshotItem[];
  isLoading: boolean;
}

const COLUMN_COUNT = 12;

function availabilityBadgeClass(isAvailable: boolean) {
  return isAvailable
    ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20'
    : 'bg-destructive/10 text-destructive border-destructive/20';
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={COLUMN_COUNT}>
            <div className="h-5 w-full animate-pulse rounded bg-muted/50" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function ExploreSnapshotItemsTable({ items, isLoading }: ExploreSnapshotItemsTableProps) {
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const toggle = (rank: number) => setExpandedRank((current) => (current === rank ? null : rank));

  if (!isLoading && !items.length) {
    return (
      <EmptyState
        icon={ListMusic}
        title="No ranked items"
        description="This snapshot has no stored items to inspect."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead className="whitespace-nowrap">Type</TableHead>
            <TableHead className="whitespace-nowrap">Title</TableHead>
            <TableHead className="whitespace-nowrap">Creator</TableHead>
            <TableHead className="whitespace-nowrap">Availability</TableHead>
            <TableHead className="whitespace-nowrap">Post ID</TableHead>
            <TableHead className="whitespace-nowrap">Music ID</TableHead>
            <TableHead className="whitespace-nowrap">Created</TableHead>
            <TableHead className="whitespace-nowrap text-right">Raw</TableHead>
            <TableHead className="whitespace-nowrap text-right">Final</TableHead>
            <TableHead className="whitespace-nowrap">Rank reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows />
          ) : (
            items.map((item) => {
              const isExpanded = expandedRank === item.rank;
              return (
                <Fragment key={item.rank}>
                  <TableRow
                    className={`cursor-pointer transition-colors ${
                      isExpanded ? 'bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                    onClick={() => toggle(item.rank)}
                  >
                    <TableCell className="py-1.5">
                      <ChevronRight
                        className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-xs tabular-nums">{item.rank}</TableCell>
                    <TableCell className="py-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {item.elementType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] py-1.5">
                      <div className="truncate text-xs font-medium" title={item.title ?? undefined}>
                        {item.title || <span className="text-muted-foreground">Untitled</span>}
                      </div>
                      {item.subtitle && (
                        <div className="truncate text-[11px] text-muted-foreground" title={item.subtitle}>
                          {item.subtitle}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-xs">
                        {item.creatorUsername || <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium ${availabilityBadgeClass(item.isAvailable)}`}
                        title={item.currentPrivacy ? `privacy: ${item.currentPrivacy}` : undefined}
                      >
                        {item.availability}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="block max-w-[130px] truncate font-mono text-[11px] text-muted-foreground" title={item.postId}>
                        {item.postId}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="block max-w-[130px] truncate font-mono text-[11px] text-muted-foreground" title={item.musicElementId}>
                        {item.musicElementId}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-1.5 text-[11px] text-muted-foreground">
                      {formatDate(item.createdAtUtc)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {formatScore(item.rawScore)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-xs font-semibold tabular-nums">
                      {formatScore(item.finalScore)}
                    </TableCell>
                    <TableCell className="max-w-[180px] py-1.5">
                      <span className="block truncate text-[11px] text-muted-foreground" title={item.rankReason}>
                        {item.rankReason || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={COLUMN_COUNT} className="bg-muted/10 p-3">
                        <ExploreScoreBreakdown item={item} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
