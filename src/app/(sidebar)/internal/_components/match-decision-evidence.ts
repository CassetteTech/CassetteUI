import type { InternalJevAttempt, InternalMatchDecisionEvidence } from '@/types';

const NO_MATCH = 'no_match';

/** A skipped or failed attempt shows its reason; it is never presented as a model no_match. */
export function modelChoiceLabel(attempt: InternalJevAttempt): string {
  if (attempt.outcome === 'answered' && attempt.answer) {
    return attempt.answer.selectedProviderTrackId ?? NO_MATCH;
  }
  return `${attempt.outcome} · ${attempt.reasonCode ?? 'no reason recorded'}`;
}

/**
 * The selection the conversion used. A Shadow attempt is never applied, so the deterministic
 * decision stays the applied result. Newer records state the applied selection, which also covers
 * a fallback that rejected an unconfirmed album. Hydration can still reject the applied selection.
 */
export function appliedResultLabel(evidence: InternalMatchDecisionEvidence): string {
  const model = evidence.modelSelection;
  const applied = evidence.appliedSelection;
  const fromModel = applied ? applied.method === 'jev_selection' : model?.applied === true;
  const selected = applied
    ? applied.providerTrackId ?? null
    : fromModel
      ? model?.attempt.answer?.selectedProviderTrackId ?? null
      : evidence.decision?.kind === 'Accepted'
        ? evidence.decision.selectedProviderTrackId ?? null
        : null;
  const origin = fromModel ? 'Jev' : 'Deterministic';
  if (!selected) {
    const reason = applied?.reasonCode ?? evidence.decision?.kind;
    return `${origin} · no match${reason ? ` (${reason})` : ''}`;
  }
  const hydration = evidence.hydration?.status;
  return hydration && hydration !== 'succeeded'
    ? `${origin} · ${selected} · hydration ${hydration}`
    : `${origin} · ${selected}`;
}

/** Model probability on a 0–1 scale, kept visually distinct from 0–100 scores and percentage accuracy. */
export function formatProbability(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? '—' : value.toFixed(3);
}

export function formatMilliseconds(value: number | null | undefined): string {
  return value == null ? 'not measured' : `${value.toLocaleString('en-US')} ms`;
}

export function formatUsd(value: number | null | undefined): string {
  if (value == null) return 'unknown';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumSignificantDigits: 3,
  }).format(value);
}

export function formatCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts);
  return entries.length === 0 ? 'none' : entries.map(([key, count]) => `${key} ${count}`).join(' · ');
}

/** A limit value in its own unit: a rate as a percentage, spend in USD, latency in milliseconds. */
export function formatLimitValue(limit: string, value: number | null | undefined): string {
  if (value == null) return 'not measured';
  if (limit.endsWith('_rate')) return `${(value * 100).toFixed(1)}%`;
  if (limit.endsWith('_usd')) return formatUsd(value);
  return formatMilliseconds(value);
}

export function limitStatusLabel(status: string): string {
  if (status === 'within_limit') return 'Within limit';
  if (status === 'exceeded') return 'Exceeded';
  return 'Not enough data';
}
