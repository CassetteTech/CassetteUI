import test from 'node:test';
import assert from 'node:assert/strict';
import type { InternalJevAttempt, InternalMatchDecisionEvidence } from '@/types';
import {
  appliedResultLabel,
  formatCounts,
  formatLimitValue,
  formatMilliseconds,
  formatProbability,
  formatUsd,
  limitStatusLabel,
  modelChoiceLabel,
} from '../match-decision-evidence';

const attempt = (overrides: Partial<InternalJevAttempt> = {}): InternalJevAttempt => ({
  outcome: 'answered',
  requestedModel: 'jev-1.13.0',
  promptVersion: 'track-selection-prompt-v1',
  answer: {
    returnedModel: 'jev-1.13.0',
    choice: 'candidate_1',
    selectedProviderTrackId: 'spotify-1',
    probability: 0.75,
    confidence: 0.8,
    probabilities: { 'spotify-0': 0.2, 'spotify-1': 0.75, no_match: 0.05 },
    inputTokens: 100,
    outputTokens: 4,
  },
  ...overrides,
});

const evidence = (overrides: Partial<InternalMatchDecisionEvidence> = {}): InternalMatchDecisionEvidence => ({
  evidenceId: 'tmd_test',
  capturedAtUtc: '2026-10-07T12:00:00Z',
  targetPlatform: 'spotify',
  trigger: 'no_source_isrc',
  captureStatus: 'captured',
  disposition: 'conversion_persisted',
  sampleRate: 1,
  schemaVersion: 1,
  payloadAvailable: true,
  options: [],
  decision: {
    kind: 'Accepted',
    missReason: 'None',
    selectedProviderTrackId: 'spotify-0',
    threshold: 75,
    scorerVersion: 'track-scoring-v1',
    decisionPolicyVersion: 'track-decision-v1',
    decisionConfigurationVersion: 'default-v1',
  },
  modelSelection: { mode: 'shadow', applied: false, attempt: attempt() },
  hydration: { status: 'succeeded' },
  ...overrides,
});

test('modelChoiceLabel never shows a skipped or failed attempt as no_match', () => {
  assert.equal(modelChoiceLabel(attempt()), 'spotify-1');
  assert.equal(
    modelChoiceLabel(attempt({ answer: { ...attempt().answer!, choice: 'no_match', selectedProviderTrackId: null } })),
    'no_match',
  );
  assert.equal(modelChoiceLabel(attempt({ outcome: 'failed', reasonCode: 'timeout', answer: null })), 'failed · timeout');
  assert.equal(modelChoiceLabel(attempt({ outcome: 'skipped', reasonCode: 'not_sampled', answer: null })), 'skipped · not_sampled');
});

test('appliedResultLabel keeps the deterministic result when the Shadow attempt is not applied', () => {
  assert.equal(appliedResultLabel(evidence()), 'Deterministic · spotify-0');
  assert.equal(
    appliedResultLabel(evidence({ decision: { ...evidence().decision!, kind: 'RejectedLowConfidence', selectedProviderTrackId: 'spotify-0' } })),
    'Deterministic · no match (RejectedLowConfidence)',
  );
  assert.equal(
    appliedResultLabel(evidence({ hydration: { status: 'identity_mismatch' } })),
    'Deterministic · spotify-0 · hydration identity_mismatch',
  );
  assert.equal(
    appliedResultLabel(evidence({ modelSelection: { mode: 'applied', applied: true, attempt: attempt() } })),
    'Jev · spotify-1',
  );
});

test('appliedResultLabel uses the recorded applied selection, including a fallback without a confirmed album', () => {
  const failed = attempt({ outcome: 'failed', reasonCode: 'timeout', answer: null });
  assert.equal(
    appliedResultLabel(evidence({
      modelSelection: { mode: 'applied', applied: false, attempt: failed },
      hydration: { status: 'not_attempted' },
      appliedSelection: { method: 'metadata_score', providerTrackId: null, reasonCode: 'album_not_confirmed' },
    })),
    'Deterministic · no match (album_not_confirmed)',
  );
  assert.equal(
    appliedResultLabel(evidence({
      modelSelection: { mode: 'applied', applied: true, attempt: attempt() },
      appliedSelection: { method: 'jev_selection', providerTrackId: null, reasonCode: 'model_no_match' },
      hydration: { status: 'not_attempted' },
    })),
    'Jev · no match (model_no_match)',
  );
});

test('limit values keep their units and statuses read as text', () => {
  assert.equal(formatLimitValue('applied_wrong_song_rate', 0.05), '5.0%');
  assert.equal(formatLimitValue('monthly_spend_usd', 10), '$10');
  assert.equal(formatLimitValue('single_track_added_latency_p95_ms', 5000), '5,000 ms');
  assert.equal(formatLimitValue('monthly_spend_usd', null), 'not measured');
  assert.equal(limitStatusLabel('exceeded'), 'Exceeded');
  assert.equal(limitStatusLabel('insufficient_data'), 'Not enough data');
});

test('formatters keep probability, latency and spend units distinct and show unknown values', () => {
  assert.equal(formatProbability(0.75), '0.750');
  assert.equal(formatProbability(null), '—');
  assert.equal(formatMilliseconds(1250), '1,250 ms');
  assert.equal(formatMilliseconds(undefined), 'not measured');
  assert.equal(formatUsd(0.0000126), '$0.0000126');
  assert.equal(formatUsd(null), 'unknown');
  assert.equal(formatCounts({}), 'none');
  assert.equal(formatCounts({ timeout: 2, rate_limited: 1 }), 'timeout 2 · rate_limited 1');
});
