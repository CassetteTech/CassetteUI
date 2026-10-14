import type {
  InternalExploreSnapshotSummary,
  InternalExploreSnapshotItem,
} from '@/types';

export const SNAPSHOT_DAYS_DEFAULT = 14;
export const SNAPSHOT_ITEM_LIMIT = 50;

export type SnapshotStatusTone = 'success' | 'failed' | 'pending';

export function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(3);
}

export function pickDefaultSnapshotId(
  snapshots: Pick<InternalExploreSnapshotSummary, 'snapshotId' | 'status' | 'isLatestSuccessful'>[]
): string | null {
  if (!snapshots.length) return null;
  const latestSuccessful = snapshots.find((s) => s.isLatestSuccessful);
  if (latestSuccessful) return latestSuccessful.snapshotId;
  const firstSucceeded = snapshots.find((s) => s.status?.toLowerCase() === 'succeeded');
  if (firstSucceeded) return firstSucceeded.snapshotId;
  return snapshots[0].snapshotId;
}

export function snapshotStatusTone(status: string | null | undefined): SnapshotStatusTone {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'succeeded') return 'success';
  if (normalized === 'failed') return 'failed';
  return 'pending';
}

export function scoreEntries(map: Record<string, number> | null | undefined): [string, number][] {
  if (!map) return [];
  return Object.entries(map).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}

export function maxAbsValue(...maps: (Record<string, number> | null | undefined)[]): number {
  let max = 0;
  for (const map of maps) {
    if (!map) continue;
    for (const value of Object.values(map)) {
      const abs = Math.abs(value);
      if (abs > max) max = abs;
    }
  }
  return max;
}

export function barWidthPercent(value: number, maxAbs: number): number {
  if (!maxAbs || Number.isNaN(maxAbs)) return 0;
  const pct = (Math.abs(value) / maxAbs) * 100;
  if (pct < 0) return 0;
  return pct > 100 ? 100 : pct;
}

export function hasPlaylistFamily(item: InternalExploreSnapshotItem): boolean {
  return Boolean(
    item.playlistFamilyKey ||
      item.playlistTitleNormalized ||
      item.playlistFamilyReason ||
      item.playlistFamilyConfidence != null
  );
}

export function formatDebugValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
