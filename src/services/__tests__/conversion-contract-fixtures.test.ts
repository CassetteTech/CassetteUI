import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import type { ConvertLifecycleResponse } from '../../types';
import { detectContentType } from '../../utils/content-type-detection';
import { getLifecycleConversionFailureMessage } from '../conversion-lifecycle';

type ContractFixture = {
  contractVersion: number;
  name: string;
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

const fixtureRoot = path.join(process.cwd(), 'contract-fixtures', 'conversion', 'v1');

function loadFixture(fileName: string): ContractFixture {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, fileName), 'utf8')) as ContractFixture;
}

function asLifecycleResponse(body: unknown): ConvertLifecycleResponse {
  assert.equal(typeof body, 'object');
  assert.notEqual(body, null);

  const response = body as Partial<ConvertLifecycleResponse> & Record<string, unknown>;
  assert.equal(typeof response.success, 'boolean');
  assert.ok(response.status === 'ready' || response.status === 'processing' || response.status === 'failed');
  assert.equal('details' in response, false);
  assert.equal('platforms' in response, false);
  assert.equal('errorMessage' in response, false);

  return response as ConvertLifecycleResponse;
}

test('conversion contract manifest lists the public lifecycle fixtures', () => {
  const manifest = loadFixture('manifest.json') as ContractFixture & {
    currentPlatforms: string[];
    fixtures: string[];
  };

  assert.equal(manifest.contractVersion, 1);
  assert.deepEqual(manifest.currentPlatforms, ['spotify', 'applemusic', 'deezer']);
  assert.deepEqual(manifest.fixtures, [
    'convert-request.spotify-track.authenticated.json',
    'convert-response.ready.json',
    'convert-response.processing.json',
    'convert-response.failed.json',
    'convert-job-response.ready.json',
  ]);
});

test('convert request fixture matches the UI convert submission contract', () => {
  const fixture = loadFixture('convert-request.spotify-track.authenticated.json');
  const body = fixture.body as { sourceLink?: string; description?: string };

  assert.equal(fixture.method, 'POST');
  assert.equal(fixture.path, '/api/v1/convert');
  assert.equal(fixture.headers?.['X-Idempotency-Key'], 'fixture-idempotency-key');
  assert.equal(body.sourceLink, 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh');
  assert.equal(body.description, 'Shared conversion contract fixture');
  assert.deepEqual(detectContentType(body.sourceLink), {
    type: 'track',
    estimatedCount: 1,
    platform: 'spotify',
    id: '4iV5W9uYEdYUVa79Axb7Rh',
  });
});

test('convert response fixtures match lifecycle-only UI response handling', () => {
  const ready = asLifecycleResponse(loadFixture('convert-response.ready.json').body);
  assert.equal(ready.status, 'ready');
  assert.equal(ready.postId, 'post_fixture_ready');
  assert.equal(ready.jobId, 'job_fixture_ready');

  const processing = asLifecycleResponse(loadFixture('convert-response.processing.json').body);
  assert.equal(processing.status, 'processing');
  assert.equal(processing.jobId, 'job_fixture_processing');
  assert.equal(processing.retryAfterMs, 400);

  const failed = asLifecycleResponse(loadFixture('convert-response.failed.json').body);
  assert.equal(failed.status, 'failed');
  assert.equal(getLifecycleConversionFailureMessage(failed), 'Unsupported music service');
});

test('job polling fixture matches lifecycle ready response contract', () => {
  const fixture = loadFixture('convert-job-response.ready.json');
  const response = asLifecycleResponse(fixture.body);

  assert.equal(fixture.method, 'GET');
  assert.equal(fixture.path, '/api/v1/convert/jobs/job_fixture_processing');
  assert.equal(response.status, 'ready');
  assert.equal(response.postId, 'post_fixture_after_poll');
  assert.equal(response.jobId, 'job_fixture_processing');
});
