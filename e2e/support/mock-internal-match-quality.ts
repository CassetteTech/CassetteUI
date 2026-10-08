import type { Page } from '@playwright/test';
import type {
  InternalConversionQualityMetrics,
  InternalConversionQualityTrendResponse,
  InternalIssueDetail,
  InternalIssuesResponse,
  InternalJevAttempt,
  InternalMatchDecisionEvidence,
} from '../../src/types';

export const fixtureMatchQualityIssueId = 'ir_20261007120000_jevshadowcase1';

const capturedAtUtc = '2026-10-07T12:00:00Z';

const attempt = (overrides: Partial<InternalJevAttempt>): InternalJevAttempt => ({
  outcome: 'answered',
  reasonCode: null,
  requestedModel: 'jev-1.13.0',
  promptVersion: 'track-selection-prompt-v1',
  answer: null,
  elapsedMilliseconds: null,
  requestElapsedMilliseconds: null,
  ...overrides,
});

const evidence = (overrides: Partial<InternalMatchDecisionEvidence>): InternalMatchDecisionEvidence => ({
  evidenceId: 'tmd_fixture',
  capturedAtUtc,
  targetPlatform: 'spotify',
  trigger: 'no_source_isrc',
  captureStatus: 'captured',
  disposition: 'conversion_persisted',
  sampleRate: 1,
  schemaVersion: 1,
  payloadAvailable: true,
  source: {
    sourcePlatform: 'applemusic',
    sourceTrackId: '170000000901',
    isrcs: [],
    title: 'Evidence Song',
    artistNames: ['Evidence Artist'],
    albumName: 'Evidence Album',
    durationMs: 205000,
    territory: 'US',
  },
  requestedTerritory: 'US',
  territoryApplied: true,
  retrieval: { status: 'completed', reasonCode: null, truncated: false, candidateCount: 2 },
  options: [
    { rank: 1, providerTrackId: 'spotify-0', title: 'Evidence Song', artistNames: ['Evidence Artist'], albumName: 'Evidence Album', durationMs: 205000, score: 95, disqualifiers: [], modelProbability: 0.2 },
    { rank: 2, providerTrackId: 'spotify-1', title: 'Evidence Song (Live)', artistNames: ['Evidence Artist'], albumName: 'Live Album', durationMs: 230000, score: 60, disqualifiers: [], modelProbability: 0.75 },
  ],
  decision: {
    kind: 'Accepted',
    missReason: 'None',
    selectedProviderTrackId: 'spotify-0',
    runnerUpProviderTrackId: 'spotify-1',
    runnerUpMargin: 35,
    threshold: 75,
    scorerVersion: 'track-scoring-v1',
    decisionPolicyVersion: 'track-decision-v1',
    decisionConfigurationVersion: 'default-v1',
  },
  modelSelection: {
    mode: 'shadow',
    applied: false,
    attempt: attempt({
      answer: {
        returnedModel: 'jev-1.13.0',
        choice: 'candidate_1',
        selectedProviderTrackId: 'spotify-1',
        probability: 0.75,
        confidence: 0.8,
        probabilities: { 'spotify-0': 0.2, 'spotify-1': 0.75, no_match: 0.05 },
        inputTokens: 1166,
        outputTokens: 4,
      },
      elapsedMilliseconds: 310,
      requestElapsedMilliseconds: 280,
    }),
  },
  hydration: { status: 'succeeded', reasonCode: null, disqualifiers: [] },
  ...overrides,
});

const issueDetail: InternalIssueDetail = {
  id: fixtureMatchQualityIssueId,
  reportType: 'wrong_match',
  sourceContext: 'post_view',
  conversionJobId: 'cj_fixture',
  createdAt: capturedAtUtc,
  payload: '{}',
  failedTracks: [],
  operationalContext: {
    recentLifecycleEvents: [],
    sanitizedClientContext: { sourceContext: 'post_view', hasPayload: false, redactedPayloadKeyCount: 0, payloadKeys: [] },
  },
  matchQualityContext: {
    outboxId: 'co_fixture',
    payloadSchemaVersion: 4,
    conversionJobId: 'cj_fixture',
    sourcePlatform: 'applemusic',
    sourceEntityType: 'track',
    recordedAtUtc: capturedAtUtc,
    evidenceTruncated: false,
    decisions: [
      {
        decisionId: 'cj_fixture:spotify',
        platform: 'spotify',
        outcome: 'accepted',
        method: 'metadata_score',
        territory: 'US',
        candidateCount: 2,
        candidateSetTruncated: false,
        evidenceId: 'tmd_linked',
        evidence: evidence({ evidenceId: 'tmd_linked' }),
      },
      {
        decisionId: 'cj_fixture:applemusic',
        platform: 'applemusic',
        outcome: 'accepted',
        method: 'isrc',
        candidateCount: 0,
        candidateSetTruncated: false,
        evidenceId: 'tmd_expired',
        evidence: null,
      },
    ],
    unlinkedEvidence: [
      evidence({
        evidenceId: 'tmd_failed_attempt',
        disposition: 'conversion_failed',
        options: evidence({}).options.map(option => ({ ...option, modelProbability: null })),
        modelSelection: {
          mode: 'shadow',
          applied: false,
          attempt: attempt({ outcome: 'failed', reasonCode: 'timeout', elapsedMilliseconds: 8000, requestElapsedMilliseconds: 7990 }),
        },
      }),
      evidence({
        evidenceId: 'tmd_oversized',
        disposition: 'pending',
        captureStatus: 'rejected_oversized',
        payloadAvailable: false,
        source: null,
        retrieval: null,
        options: [],
        decision: null,
        modelSelection: null,
        hydration: null,
      }),
    ],
  },
};

const rate = (numerator: number, denominator: number) => ({
  numerator,
  denominator,
  value: denominator === 0 ? null : numerator / denominator,
});

const metrics = (): InternalConversionQualityMetrics => ({
  qualityOpportunities: 2,
  accepted: 1,
  qualityRejections: 1,
  operationalFailures: 0,
  adjudicatedOpportunities: 1,
  adjudicatedExpectedMatches: 1,
  adjudicatedExpectedMisses: 0,
  reasonCounts: { low_confidence: 1 },
  acceptedMethodCounts: { metadata_score: 1 },
  targetMatchAcceptanceRate: rate(1, 2),
  noMatchRate: rate(1, 2),
  noCandidateRate: rate(0, 2),
  lowConfidenceRejectionRate: rate(1, 2),
  ambiguousMatchRate: rate(0, 2),
  policyRejectionRate: rate(0, 2),
  operationalFailureRate: rate(0, 2),
  successfulTargetMatchRate: rate(0, 1),
  decisionAccuracy: rate(0, 1),
  wrongMatchRate: {},
  falsePositiveAcceptanceRate: {},
  expectedMatchMissRate: rate(1, 1),
});

const trends: InternalConversionQualityTrendResponse = {
  generatedAtUtc: capturedAtUtc,
  windowStartUtc: '2026-09-08T00:00:00Z',
  windowEndUtc: '2026-10-08T00:00:00Z',
  days: 30,
  metricContract: '1.0',
  sourceRowsTruncated: false,
  adjudicationRowsTruncated: false,
  parsedEventCount: 2,
  deduplicatedDecisionCount: 2,
  filters: {},
  productionUnlabeled: metrics(),
  productionAdjudicated: metrics(),
  daily: [],
  versionCohorts: [],
  dimensions: [],
  offlineBaseline: {
    cohort: 'offline_deterministic',
    datasetVersion: '1.0.0',
    datasetDigestSha256: 'f0c71740e8fca655b364322272640137bd1e05a726592622258737135e850499',
    policyVersion: 'legacy_first_result@1.0.0',
    configurationVersion: 'legacy-first-result-v1',
    scorerVersion: 'none',
    cases: 14,
    passed: 10,
    failed: 4,
    successfulTargetMatchRate: rate(8, 9),
    decisionAccuracy: rate(10, 14),
    targetMatchAcceptanceRate: rate(12, 14),
    wrongMatchRate: rate(4, 12),
  },
  evidenceCoverage: {
    rowsTruncated: false,
    retentionDays: 180,
    windowExceedsRetention: false,
    records: 4,
    rejectedOversized: 1,
    unreadablePayloads: 0,
    linkedToOutcomes: 2,
    unlinkedDispositionCounts: { conversion_failed: 1, pending: 1 },
    metadataDecisionsWithoutEvidence: 3,
    linkedEvidenceNotFound: 1,
    sampleRates: [1],
  },
  jevSelection: [
    {
      provider: 'spotify',
      context: 'single_track_conversion',
      mode: 'shadow',
      model: 'jev-1.13.0',
      promptVersion: 'track-selection-prompt-v1',
      capturedDecisions: 3,
      attempts: 3,
      calls: 2,
      callRate: rate(2, 3),
      answered: 1,
      failed: 1,
      skipped: 1,
      failureReasonCounts: { timeout: 1 },
      skipReasonCounts: { budget_exhausted: 1 },
      unappliedRecoveries: 1,
      appliedRecoveries: 0,
      disagreements: 0,
      inputTokens: 1166,
      outputTokens: 4,
      callsWithoutUsage: 1,
      estimatedSpendUsd: 0.000049,
      requestLatency: { measured: 2, medianMs: 280, p95Ms: 7990 },
      addedLatency: { measured: 3, medianMs: 310, p95Ms: 8000 },
      adjudicatedAnswered: 1,
      modelDecisionAccuracy: rate(1, 1),
      deterministicDecisionAccuracy: rate(0, 1),
      modelWrongSongs: 0,
      modelNoMatchErrors: 0,
      deterministicNoMatchErrors: 1,
    },
  ],
  jevTimingBoundary:
    'Added latency runs from the start of the Jev concurrency wait to the attempt result. Percentiles use the nearest-rank method.',
  jevPriceAssumptions: [
    {
      model: 'jev-1.13.0',
      inputUsdPerMillionTokens: 0.042,
      outputUsdPerMillionTokens: 0,
      checkedOn: '2026-09-21',
      source: 'https://docs.typesafe.ai/models',
    },
  ],
  jevLimitComparisons: [
    { limit: 'applied_wrong_song_rate', threshold: 0.05, observed: null, measured: 0, status: 'insufficient_data' },
    { limit: 'applied_no_match_error_rate', threshold: 0, observed: null, measured: 0, status: 'insufficient_data' },
    { limit: 'monthly_spend_usd', threshold: 10, observed: 0.0001, measured: 3, status: 'within_limit' },
    { limit: 'single_track_added_latency_p95_ms', threshold: 5000, observed: 8000, measured: 3, status: 'exceeded' },
  ],
  caveats: ['Jev limit comparisons use the operator-configured approved limits and the selected filters.'],
};

const issues: InternalIssuesResponse = {
  items: [{ id: issueDetail.id, reportType: issueDetail.reportType, sourceContext: issueDetail.sourceContext, createdAt: capturedAtUtc }],
  page: 1,
  pageSize: 25,
  totalItems: 1,
  totalPages: 1,
};

/**
 * Serves the internal issue and conversion-quality endpoints. Like Bridge, it refuses accounts that
 * are not internal. `urls` records every call, so a test can prove that a denied page fetched nothing.
 */
export async function mockInternalMatchQuality(page: Page, { authorized }: { authorized: boolean }) {
  const urls: string[] = [];
  const state = { urls };
  await page.route(/\/api\/v1\/internal\/(issues|conversion-quality)(\/|\?|$)/, async route => {
    const url = new URL(route.request().url());
    state.urls.push(`${url.pathname}${url.search}`);
    if (!authorized) return route.fulfill({ status: 403, json: { message: 'Forbidden' } });
    const pathname = url.pathname;
    if (pathname === '/api/v1/internal/issues') return route.fulfill({ json: issues });
    if (pathname === `/api/v1/internal/issues/${issueDetail.id}`) return route.fulfill({ json: issueDetail });
    if (pathname === '/api/v1/internal/conversion-quality/trends') return route.fulfill({ json: trends });
    return route.fulfill({ status: 404, json: { message: 'Unexpected internal request.' } });
  });
  return state;
}
