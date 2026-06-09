// Pure helpers for the internal Explore snapshot inspection tab.
// Kept free of React/runtime imports so they can be unit-tested with node:test.
import type {
  InternalExploreSnapshotSummary,
  InternalExploreSnapshotItem,
} from '@/types';

export const SNAPSHOT_DAYS_DEFAULT = 14;
export const SNAPSHOT_ITEM_LIMIT = 50;

export type SnapshotStatusTone = 'success' | 'failed' | 'pending';

/** Format a score/score-component value to a fixed 3 decimal places (e.g. 0.5 → "0.500", -0.1 → "-0.100"). */
export function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(3);
}

/**
 * Choose the snapshot to select by default: the latest successful one, falling back to the first
 * Succeeded row, then the newest row overall. Returns null for an empty list.
 */
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

/** Maps a snapshot status string to a visual tone for badges. */
export function snapshotStatusTone(status: string | null | undefined): SnapshotStatusTone {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'succeeded') return 'success';
  if (normalized === 'failed') return 'failed';
  return 'pending';
}

/** Sorted [key, value] entries of a numeric map, largest magnitude first, for compact bar rendering. */
export function scoreEntries(map: Record<string, number> | null | undefined): [string, number][] {
  if (!map) return [];
  return Object.entries(map).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}

/** Largest absolute value across a set of numeric maps; used to scale horizontal bars consistently. */
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

/** Bar width as a 0–100 percentage of the provided scale. */
export function barWidthPercent(value: number, maxAbs: number): number {
  if (!maxAbs || Number.isNaN(maxAbs)) return 0;
  const pct = (Math.abs(value) / maxAbs) * 100;
  if (pct < 0) return 0;
  return pct > 100 ? 100 : pct;
}

/** True when a snapshot item carries playlist-family grouping metadata worth showing. */
export function hasPlaylistFamily(item: InternalExploreSnapshotItem): boolean {
  return Boolean(
    item.playlistFamilyKey ||
      item.playlistTitleNormalized ||
      item.playlistFamilyReason ||
      item.playlistFamilyConfidence != null
  );
}

/** Render an arbitrary debug-metadata value (from constraint notes / candidate sources) as a short string. */
export function formatDebugValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
