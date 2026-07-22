import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRIDGE_RELEASE_PATH,
  EXPECTED_REPOSITORY,
  RELEASE_SECRET_HEADER,
  runReleaseEmailIngestion,
} from '../ingest-release-email.mjs';

const RELEASE_ID = 42;
const GITHUB_RELEASE_URL =
  'https://api.github.com/repos/CassetteTech/CassetteUI/releases/42';

function environment(overrides = {}) {
  return {
    GITHUB_REPOSITORY: EXPECTED_REPOSITORY,
    GITHUB_API_URL: 'https://api.github.com',
    RELEASE_ID_INPUT: String(RELEASE_ID),
    CURATED_SUMMARY: 'A concise customer-facing summary.',
    GITHUB_TOKEN: 'github-token',
    CASSETTE_RELEASE_INGESTION_SECRET: 'release-secret',
    CASSETTE_BRIDGE_RELEASE_INGESTION_URL:
      'https://bridge.example/api/v1/internal/email/releases',
    ...overrides,
  };
}

function release(overrides = {}) {
  return {
    id: RELEASE_ID,
    url: GITHUB_RELEASE_URL,
    name: 'Cassette v1.2.3',
    draft: false,
    published_at: '2026-07-14T14:00:00Z',
    html_url: 'https://github.com/CassetteTech/CassetteUI/releases/tag/v1.2.3',
    body: 'Raw release notes must not be ingested.',
    ...overrides,
  };
}

function batch(overrides = {}) {
  return {
    repository: EXPECTED_REPOSITORY,
    githubReleaseId: RELEASE_ID,
    status: 'processing',
    scannedThisBatch: 25,
    enqueuedThisBatch: 12,
    scannedTotal: 25,
    enqueuedTotal: 12,
    completed: false,
    ...overrides,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function queuedFetch(responses, calls) {
  return async (url, options) => {
    calls.push({ url, options });
    const response = responses.shift();
    assert.ok(response, `Unexpected request to ${url}`);
    return response;
  };
}

test('reads the published GitHub release and ingests bounded Bridge batches', async () => {
  const calls = [];
  const logs = [];
  const responses = [
    jsonResponse(release()),
    jsonResponse(batch()),
    jsonResponse(
      batch({
        status: 'completed',
        scannedThisBatch: 3,
        enqueuedThisBatch: 2,
        scannedTotal: 28,
        enqueuedTotal: 14,
        completed: true,
      }),
    ),
  ];

  const result = await runReleaseEmailIngestion({
    environment: environment(),
    fetchImpl: queuedFetch(responses, calls),
    log: (message) => logs.push(message),
  });

  assert.equal(result.completed, true);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, GITHUB_RELEASE_URL);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer github-token');
  assert.equal(calls[0].options.headers['X-GitHub-Api-Version'], '2022-11-28');

  const expectedRequest = {
    repository: EXPECTED_REPOSITORY,
    githubReleaseId: RELEASE_ID,
    published: true,
    draft: false,
    title: 'Cassette v1.2.3',
    summary: 'A concise customer-facing summary.',
    releaseUrl: 'https://github.com/CassetteTech/CassetteUI/releases/tag/v1.2.3',
  };
  for (const call of calls.slice(1)) {
    assert.equal(call.url, `https://bridge.example${BRIDGE_RELEASE_PATH}`);
    assert.equal(call.options.method, 'POST');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.headers[RELEASE_SECRET_HEADER], 'release-secret');
    assert.deepEqual(JSON.parse(call.options.body), expectedRequest);
  }
  assert.deepEqual(logs, ['batches=2 scanned_total=28 enqueued_total=14']);
  assert.equal(responses.length, 0);
});

test('rejects execution outside the exact CassetteUI repository before fetching', async () => {
  let fetchCount = 0;

  await assert.rejects(
    runReleaseEmailIngestion({
      environment: environment({ GITHUB_REPOSITORY: 'OtherOrg/CassetteUI' }),
      fetchImpl: async () => {
        fetchCount += 1;
        return jsonResponse({});
      },
    }),
    /only in CassetteTech\/CassetteUI/u,
  );

  assert.equal(fetchCount, 0);
});

test('requires the exact HTTPS Bridge release-ingestion endpoint', async (t) => {
  const invalidUrls = [
    'http://bridge.example/api/v1/internal/email/releases',
    'https://bridge.example',
    'https://bridge.example/api/v1/internal/email/releases?recipient=hidden',
  ];

  for (const url of invalidUrls) {
    await t.test(url, async () => {
      let fetchCount = 0;
      await assert.rejects(
        runReleaseEmailIngestion({
          environment: environment({
            CASSETTE_BRIDGE_RELEASE_INGESTION_URL: url,
          }),
          fetchImpl: async () => {
            fetchCount += 1;
            return jsonResponse({});
          },
        }),
        /CASSETTE_BRIDGE_RELEASE_INGESTION_URL/u,
      );
      assert.equal(fetchCount, 0);
    });
  }
});

test('rejects untrusted GitHub release metadata before calling Bridge', async (t) => {
  const cases = [
    {
      name: 'mismatched release repository',
      metadata: release({
        url: 'https://api.github.com/repos/OtherOrg/CassetteUI/releases/42',
      }),
      error: /mismatched repository/u,
    },
    {
      name: 'draft release',
      metadata: release({ draft: true }),
      error: /draft or unpublished/u,
    },
    {
      name: 'unpublished release',
      metadata: release({ published_at: null }),
      error: /draft or unpublished/u,
    },
    {
      name: 'non-HTTPS release URL',
      metadata: release({
        html_url: 'http://github.com/CassetteTech/CassetteUI/releases/tag/v1.2.3',
      }),
      error: /does not match the CassetteUI release contract/u,
    },
    {
      name: 'release URL from another repository',
      metadata: release({
        html_url: 'https://github.com/OtherOrg/CassetteUI/releases/tag/v1.2.3',
      }),
      error: /does not match the CassetteUI release contract/u,
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const calls = [];
      await assert.rejects(
        runReleaseEmailIngestion({
          environment: environment(),
          fetchImpl: queuedFetch([jsonResponse(testCase.metadata)], calls),
        }),
        testCase.error,
      );
      assert.equal(calls.length, 1);
    });
  }
});

test('stops after the configured batch bound without logging per-recipient data', async () => {
  const calls = [];
  const logs = [];
  const responses = [
    jsonResponse(release()),
    jsonResponse(batch()),
    jsonResponse(
      batch({
        scannedTotal: 50,
        enqueuedThisBatch: 5,
        enqueuedTotal: 17,
      }),
    ),
  ];

  await assert.rejects(
    runReleaseEmailIngestion({
      environment: environment(),
      fetchImpl: queuedFetch(responses, calls),
      log: (message) => logs.push(message),
      maxBatches: 2,
    }),
    /exceeded 2 batches\. scanned_total=50 enqueued_total=17/u,
  );

  assert.equal(calls.length, 3);
  assert.deepEqual(logs, []);
  assert.equal(responses.length, 0);
});

test('does not read or log Bridge error response bodies', async () => {
  const calls = [];
  const logs = [];
  let errorBodyRead = false;
  const bridgeFailure = {
    ok: false,
    status: 500,
    async json() {
      errorBodyRead = true;
      return { recipient: 'sensitive@example.com' };
    },
  };

  await assert.rejects(
    runReleaseEmailIngestion({
      environment: environment(),
      fetchImpl: queuedFetch([jsonResponse(release()), bridgeFailure], calls),
      log: (message) => logs.push(message),
    }),
    /Bridge release ingestion failed with status 500/u,
  );

  assert.equal(errorBodyRead, false);
  assert.deepEqual(logs, []);
});
