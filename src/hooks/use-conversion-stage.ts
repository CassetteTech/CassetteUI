import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import type { ConvertPartialResult } from '@/types';

/**
 * Human-readable labels for the coarse conversion stages Bridge persists on
 * the job row (ConvertStage in CassetteBridge/API/DTO/ConvertContracts.cs).
 */
export const CONVERSION_STAGE_LABELS: Record<string, string> = {
  parsing_source: 'Reading your link',
  matching_platforms: 'Matching across services',
  importing_playlist: 'Importing playlist tracks',
  fetching_source: 'Fetching playlist tracks',
  matching_tracks: 'Matching tracks',
  saving_playlist: 'Saving your playlist',
  finalizing: 'Finalizing your post',
};

export interface ConversionStageState {
  stage: string | null;
  label: string;
  progress: { processed: number; total: number } | null;
  partialResult: ConvertPartialResult | null;
}

export function useConversionStage(
  idempotencyKey: string | null,
  options?: { anonymous?: boolean; intervalMs?: number }
): ConversionStageState {
  const [stage, setStage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [partialResult, setPartialResult] = useState<ConvertPartialResult | null>(null);
  const anonymous = options?.anonymous;
  const intervalMs = options?.intervalMs ?? 700;

  useEffect(() => {
    setStage(null);
    setProgress(null);
    setPartialResult(null);
    if (!idempotencyKey) {
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    // The job row normally appears within a second or two of the POST. A
    // submission Bridge rejects before it creates the job never appears.
    let consecutiveMisses = 0;
    const MAX_CONSECUTIVE_MISSES = 6;

    const poll = async () => {
      const job = await apiService.getConvertJobByKey(idempotencyKey, { anonymous });
      if (cancelled) return;
      if (job) {
        consecutiveMisses = 0;
        if (job.stage) {
          setStage((prev) => (prev === job.stage ? prev : job.stage ?? prev));
        }
        if (job.partialResult) {
          const next = job.partialResult;
          setPartialResult((prev) => (prev && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        }
        if (job.tracksTotal) {
          const next = { processed: job.tracksProcessed ?? 0, total: job.tracksTotal };
          setProgress((prev) =>
            prev && prev.processed === next.processed && prev.total === next.total ? prev : next
          );
        }
      } else {
        consecutiveMisses += 1;
        if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
          return;
        }
      }
      pollTimer = setTimeout(poll, intervalMs);
    };

    pollTimer = setTimeout(poll, 250);

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [idempotencyKey, anonymous, intervalMs]);

  const stageLabel = (stage && CONVERSION_STAGE_LABELS[stage]) || CONVERSION_STAGE_LABELS.parsing_source;
  const label =
    stage === 'matching_tracks' && progress
      ? `${stageLabel} · ${progress.processed} of ${progress.total}`
      : stageLabel;

  return { stage, label, progress, partialResult };
}
