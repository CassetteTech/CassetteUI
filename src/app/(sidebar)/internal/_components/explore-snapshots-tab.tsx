'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  RefreshCw,
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
import {
  SectionHeader,
  Panel,
  StatStrip,
  Stat,
  StatusPill,
  Field,
  type Tone,
} from './kit';

const DAY_RANGES = [7, 14, 30, 90];

function statusTone(status: string): Tone {
  switch (snapshotStatusTone(status)) {
    case 'success':
      return 'success';
    case 'failed':
      return 'critical';
    default:
      return 'warning';
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
    <div className="flex flex-col gap-4">
      <SectionHeader
        section="Engineering"
        title="Snapshots"
        actions={
          <div className="flex items-center gap-1">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={snapshotsLoading}
              onClick={() => void loadSnapshots()}
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${snapshotsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        {/* Snapshot selector */}
        <div className="xl:w-[300px] xl:shrink-0">
          <Panel title="Snapshots">
            {snapshotsError ? (
              <div className="p-3">
                <ErrorState message={snapshotsError} onRetry={() => void loadSnapshots()} />
              </div>
            ) : snapshotsLoading && !snapshots.length ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                    <div className="ml-auto h-3 w-12 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : !snapshots.length ? (
              <div className="p-3">
                <EmptyState
                  icon={Database}
                  title="No snapshots"
                  description={`No Explore snapshots generated in the last ${days} days.`}
                />
              </div>
            ) : (
              <div className="max-h-[calc(100vh-14rem)] overflow-y-auto no-scrollbar divide-y divide-border">
                {snapshots.map((snapshot) => {
                  const isSelected = snapshot.snapshotId === selectedId;
                  const warnings = snapshot.validationWarnings.length;
                  const fatals = snapshot.validationFatalErrors.length;
                  return (
                    <button
                      key={snapshot.snapshotId}
                      type="button"
                      onClick={() => handleSelect(snapshot.snapshotId)}
                      className={`w-full px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? 'bg-domain/[0.07]'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-foreground">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDate(snapshot.generatedAtUtc)}
                        </span>
                        <StatusPill
                          tone={statusTone(snapshot.status)}
                          label={snapshot.status}
                        />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground font-mono tabular-nums">
                        <span>{snapshot.algorithmVersion}</span>
                        <span>{snapshot.candidateCount} cand · {snapshot.storedItemCount} items</span>
                      </div>
                      {(snapshot.isLatestSuccessful || fatals > 0 || warnings > 0) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {snapshot.isLatestSuccessful && (
                            <StatusPill tone="domain" label="Live" />
                          )}
                          {fatals > 0 && (
                            <StatusPill tone="critical" label={`${fatals} fatal`} />
                          )}
                          {warnings > 0 && (
                            <StatusPill tone="warning" label={`${warnings} warn`} />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* Selected snapshot detail + ranked items */}
        <div className="min-w-0 flex-1 flex flex-col gap-3">
          {!selectedSnapshot ? (
            <Panel>
              <div className="p-4">
                <EmptyState
                  icon={Layers}
                  title="No snapshot selected"
                  description="Pick a snapshot from the list to inspect its ranked items."
                />
              </div>
            </Panel>
          ) : (
            <>
              {/* Detail panel */}
              <Panel
                title={
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] tabular-nums text-foreground truncate">
                      {selectedSnapshot.snapshotId}
                    </span>
                    <StatusPill tone={statusTone(selectedSnapshot.status)} label={selectedSnapshot.status} />
                    {selectedSnapshot.isLatestSuccessful && (
                      <StatusPill tone="domain" label="Live on Explore" />
                    )}
                  </div>
                }
              >
                <div className="divide-y divide-border">
                  {/* Stat strip */}
                  <StatStrip className="rounded-none border-0 border-b">
                    <Stat label="Generated" value={formatDate(selectedSnapshot.generatedAtUtc)} />
                    <Stat label="Algorithm" value={selectedSnapshot.algorithmVersion} />
                    <Stat label="Candidates" value={selectedSnapshot.candidateCount} />
                    <Stat label="Items" value={selectedSnapshot.storedItemCount} />
                    <Stat label="Seed" value={selectedSnapshot.seed || '—'} />
                  </StatStrip>

                  {/* Field rows */}
                  {(selectedSnapshot.failureReason ||
                    selectedSnapshot.validationFatalErrors.length > 0 ||
                    selectedSnapshot.validationWarnings.length > 0 ||
                    distribution) && (
                    <div className="px-3 py-2 space-y-2">
                      {selectedSnapshot.failureReason && (
                        <div className="flex items-start gap-2">
                          <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                          <span className="font-mono text-[11px] text-destructive">{selectedSnapshot.failureReason}</span>
                        </div>
                      )}

                      {selectedSnapshot.validationFatalErrors.length > 0 && (
                        <div className="space-y-0.5">
                          <Field label="Fatal errors" icon={XCircle}>
                            <span className="text-destructive font-mono tabular-nums">
                              {selectedSnapshot.validationFatalErrors.length}
                            </span>
                          </Field>
                          {selectedSnapshot.validationFatalErrors.map((err, i) => (
                            <p key={i} className="font-mono text-[11px] text-destructive pl-3">{err}</p>
                          ))}
                        </div>
                      )}

                      {selectedSnapshot.validationWarnings.length > 0 && (
                        <div className="space-y-0.5">
                          <Field label="Warnings" icon={Hash}>
                            <span className="font-mono tabular-nums text-[hsl(var(--warning-text))]">
                              {selectedSnapshot.validationWarnings.length}
                            </span>
                          </Field>
                          {selectedSnapshot.validationWarnings.map((warn, i) => (
                            <p key={i} className="font-mono text-[11px] text-[hsl(var(--warning-text))] pl-3">{warn}</p>
                          ))}
                        </div>
                      )}

                      {distribution && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                            Type dist
                          </span>
                          {distribution.map(([type, count]) => (
                            <span key={type} className="font-mono text-[11px] tabular-nums text-foreground">
                              {type}: {count}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>

              {/* Ranked items */}
              <Panel
                title="Ranked items"
                actions={
                  itemsResponse ? (
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      Top {itemsResponse.returnedItemCount} of {itemsResponse.totalItemCount.toLocaleString()}
                    </span>
                  ) : undefined
                }
              >
                {itemsError ? (
                  <div className="p-4">
                    <ErrorState message={itemsError} onRetry={() => selectedId && void loadItems(selectedId)} />
                  </div>
                ) : (
                  <ExploreSnapshotItemsTable items={itemsResponse?.items ?? []} isLoading={itemsLoading} />
                )}
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
