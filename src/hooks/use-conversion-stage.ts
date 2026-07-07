import { useEffect, useRef, useState } from 'react';
import { apiService } from '@/services/api';

/**
 * Human-readable labels for the coarse conversion stages Bridge persists on
 * the job row (ConvertStage in CassetteBridge/API/DTO/ConvertContracts.cs).
 */
export const CONVERSION_STAGE_LABELS: Record<string, string> = {
  parsing_source: 'Reading your link',
  matching_platforms: 'Matching across services',
  importing_playlist: 'Importing playlist tracks',
  finalizing: 'Finalizing your post',
};

/**
 * Elapsed-time fallback labels used until Bridge reports a real stage
 * (older deployments don't write stages). Keeps the readout moving so a
 * long playlist conversion never looks stuck on one line.
 */
const FALLBACK_LABELS: Array<{ afterMs: number; label: string }> = [
  { afterMs: 0, label: 'Contacting your services' },
  { afterMs: 3000, label: 'Matching across services' },
  { afterMs: 9000, label: 'Still working on it' },
  { afterMs: 20000, label: 'Big links take a little longer' },
];

export interface ConversionStageState {
  /** Raw Bridge stage value, or null until one is reported. */
  stage: string | null;
  /** Display label: the real stage's label once known, else a time-based fallback. */
  label: string;
}

/**
 * Polls the conversion job by idempotency key while a conversion is in
 * flight and returns the latest stage reported by Bridge plus a display
 * label. The job row is created when POST /convert is accepted, so polling
 * by the same idempotency key the client sent surfaces real progress even
 * though the convert request itself is still pending. Pass null to stop.
 */
export function useConversionStage(
  idempotencyKey: string | null,
  options?: { anonymous?: boolean; intervalMs?: number }
): ConversionStageState {
  const [stage, setStage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const anonymous = options?.anonymous;
  const intervalMs = options?.intervalMs ?? 700;

  useEffect(() => {
    if (!idempotencyKey) {
      setStage(null);
      setElapsedMs(0);
      return;
    }

    startedAtRef.current = Date.now();
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    // The job row normally appears within a second or two of the POST being
    // accepted. Repeated misses mean this Bridge deployment doesn't expose
    // the by-key endpoint (or stage reporting) yet — stop polling and let
    // the elapsed-time fallback labels carry the readout instead of logging
    // a failed request every interval for the whole conversion.
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
      } else {
        consecutiveMisses += 1;
        if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) {
          return;
        }
      }
      pollTimer = setTimeout(poll, intervalMs);
    };

    // Small head start: the job row appears as soon as Bridge accepts the POST.
    pollTimer = setTimeout(poll, 250);

    // Drive the elapsed-time fallback labels once a second.
    const elapsedTimer = setInterval(() => {
      if (!cancelled) setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      clearInterval(elapsedTimer);
    };
  }, [idempotencyKey, anonymous, intervalMs]);

  const fallback = FALLBACK_LABELS.reduce(
    (current, step) => (elapsedMs >= step.afterMs ? step.label : current),
    FALLBACK_LABELS[0].label
  );

  const label = (stage && CONVERSION_STAGE_LABELS[stage]) || fallback;

  return { stage, label };
}
