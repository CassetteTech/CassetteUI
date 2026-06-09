'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hash,
  Database,
  Clock,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type {
  InternalExploreSnapshotSummary,
  InternalExploreSnapshotItemsResponse,
} from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from './internal-utils';
import {
  SNAPSHOT_DAYS_DEFAULT,
  SNAPSHOT_ITEM_LIMIT,
  pickDefaultSnapshotId,
  snapshotStatusTone,
} from './explore-snapshot-utils';
import { ExploreSnapshotItemsTable } from './explore-snapshot-items-table';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';

const DAY_RANGES = [7, 14, 30, 90];

function statusBadgeClass(status: string) {
  switch (snapshotStatusTone(status)) {
    case 'success':
      return 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20';
    case 'failed':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20';
  }
}

/** Pull a numeric {Type: count} distribution out of the open-shaped validation metrics, if present. */
function readContentTypeDistribution(
  metrics: Record<string, unknown> | null | undefined
): [string, number][] | null {
  const dist = metrics?.['content_type_distribution'];
  if (!dist || typeof dist !== 'object' || Array.isArray(dist)) return null;
  const entries = Object.entries(dist as Record<string, unknown>).filter(
    ([, value]) => typeof value === 'number'
  ) as [string, number][];
  return entries.length ? entries : null;
}

function SummaryStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function ExploreSnapshotsTab() {
  const [days, setDays] = useState(SNAPSHOT_DAYS_DEFAULT);
  const [snapshots, setSnapshots] = useState<InternalExploreSnapshotSummary[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPickedId, setUserPickedId] = useState(false);

  const [itemsResponse, setItemsResponse] = useState<InternalExploreSnapshotItemsResponse | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    try {
      const response = await apiService.getInternalExploreSnapshots(days);
      setSnapshots(response.items);
    } catch (error) {
      setSnapshotsError(error instanceof Error ? error.message : 'Failed to load snapshots');
    } finally {
      setSnapshotsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  // Default-select the latest successful snapshot until the user explicitly picks one.
  useEffect(() => {
    if (userPickedId) {
      // Keep the user's selection only while it still exists in the list.
      if (selectedId && snapshots.some((s) => s.snapshotId === selectedId)) return;
    }
    const next = pickDefaultSnapshotId(snapshots);
    setSelectedId(next);
    setUserPickedId(false);
  }, [snapshots, userPickedId, selectedId]);

  const loadItems = useCallback(async (snapshotId: string) => {
    setItemsLoading(true);
    setItemsError(null);
    try {
      const response = await apiService.getInternalExploreSnapshotItems(snapshotId, SNAPSHOT_ITEM_LIMIT);
      setItemsResponse(response);
    } catch (error) {
      setItemsResponse(null);
      setItemsError(error instanceof Error ? error.message : 'Failed to load snapshot items');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setItemsResponse(null);
      return;
    }
    void loadItems(selectedId);
  }, [selectedId, loadItems]);

  const selectedSnapshot = useMemo(
    () => snapshots.find((s) => s.snapshotId === selectedId) ?? null,
    [snapshots, selectedId]
  );

  const distribution = readContentTypeDistribution(selectedSnapshot?.validationMetrics);

  const handleSelect = (snapshotId: string) => {
    setUserPickedId(true);
    setSelectedId(snapshotId);
  };

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      {/* Snapshot selector */}
      <div className="xl:w-[320px] xl:shrink-0">
        <Card>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                <Layers className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-semibold">Snapshots</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={snapshotsLoading}
              onClick={() => void loadSnapshots()}
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${snapshotsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <div className="flex items-center gap-1 px-4 pb-3">
            {DAY_RANGES.map((range) => (
              <Button
                key={range}
                variant={days === range ? 'default' : 'outline'}
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={() => setDays(range)}
              >
                {range}d
              </Button>
            ))}
          </div>

          <CardContent className="pt-0">
            {snapshotsError ? (
              <ErrorState message={snapshotsError} onRetry={() => void loadSnapshots()} />
            ) : snapshotsLoading && !snapshots.length ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
                ))}
              </div>
            ) : !snapshots.length ? (
              <EmptyState
                icon={Database}
                title="No snapshots"
                description={`No Explore snapshots generated in the last ${days} days.`}
              />
            ) : (
              <div className="max-h-[calc(100vh-16rem)] space-y-1.5 overflow-y-auto no-scrollbar">
                {snapshots.map((snapshot) => {
                  const isSelected = snapshot.snapshotId === selectedId;
                  const warnings = snapshot.validationWarnings.length;
                  const fatals = snapshot.validationFatalErrors.length;
                  return (
                    <button
                      key={snapshot.snapshotId}
                      type="button"
                      onClick={() => handleSelect(snapshot.snapshotId)}
                      className={`w-full rounded-lg border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/10'
                          : 'hover:border-border/80 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDate(snapshot.generatedAtUtc)}
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(snapshot.status)}`}>
                          {snapshot.status}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="font-mono">{snapshot.algorithmVersion}</span>
                        <span className="tabular-nums">
                          {snapshot.candidateCount} cand · {snapshot.storedItemCount} items
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {snapshot.isLatestSuccessful && (
                          <Badge
                            variant="outline"
                            className="h-4 gap-0.5 px-1 text-[9px] bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" /> Live
                          </Badge>
                        )}
                        {fatals > 0 && (
                          <Badge variant="outline" className="h-4 gap-0.5 px-1 text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                            <XCircle className="h-2.5 w-2.5" /> {fatals} fatal
                          </Badge>
                        )}
                        {warnings > 0 && (
                          <Badge variant="outline" className="h-4 gap-0.5 px-1 text-[9px] bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20">
                            <AlertTriangle className="h-2.5 w-2.5" /> {warnings} warn
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected snapshot detail + ranked items */}
      <div className="min-w-0 flex-1">
        <Card>
          <CardContent className="space-y-4 p-4 md:p-6">
            {!selectedSnapshot ? (
              <EmptyState
                icon={Layers}
                title="No snapshot selected"
                description="Pick a snapshot from the list to inspect its ranked items."
              />
            ) : (
              <>
                {/* Summary header */}
                <div className="space-y-3 border-b pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{selectedSnapshot.snapshotId}</span>
                    <Badge variant="outline" className={`text-[10px] ${statusBadgeClass(selectedSnapshot.status)}`}>
                      {selectedSnapshot.status}
                    </Badge>
                    {selectedSnapshot.isLatestSuccessful && (
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20"
                      >
                        Live on Explore
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <SummaryStat icon={Clock} label="Generated" value={formatDate(selectedSnapshot.generatedAtUtc)} />
                    <SummaryStat icon={Hash} label="Algorithm" value={selectedSnapshot.algorithmVersion} />
                    <SummaryStat icon={Database} label="Candidates" value={selectedSnapshot.candidateCount.toLocaleString()} />
                    <SummaryStat icon={Layers} label="Items" value={selectedSnapshot.storedItemCount.toLocaleString()} />
                    <SummaryStat icon={Hash} label="Seed" value={selectedSnapshot.seed || '—'} />
                  </div>

                  {selectedSnapshot.failureReason && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <p className="text-xs text-destructive">{selectedSnapshot.failureReason}</p>
                    </div>
                  )}

                  {selectedSnapshot.validationFatalErrors.length > 0 && (
                    <div className="space-y-1 rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-destructive">Fatal errors</p>
                      {selectedSnapshot.validationFatalErrors.map((err, i) => (
                        <p key={i} className="font-mono text-[11px] text-destructive">{err}</p>
                      ))}
                    </div>
                  )}

                  {selectedSnapshot.validationWarnings.length > 0 && (
                    <div className="space-y-1 rounded-md border border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/5 p-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--warning))]">Warnings</p>
                      {selectedSnapshot.validationWarnings.map((warn, i) => (
                        <p key={i} className="font-mono text-[11px] text-[hsl(var(--warning))]">{warn}</p>
                      ))}
                    </div>
                  )}

                  {distribution && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Type distribution
                      </span>
                      {distribution.map(([type, count]) => (
                        <Badge key={type} variant="secondary" className="text-[10px] tabular-nums">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ranked items */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Ranked items</h3>
                  {itemsResponse && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      Top {itemsResponse.returnedItemCount} of {itemsResponse.totalItemCount.toLocaleString()}
                    </span>
                  )}
                </div>

                {itemsError ? (
                  <ErrorState message={itemsError} onRetry={() => selectedId && void loadItems(selectedId)} />
                ) : (
                  <ExploreSnapshotItemsTable items={itemsResponse?.items ?? []} isLoading={itemsLoading} />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
