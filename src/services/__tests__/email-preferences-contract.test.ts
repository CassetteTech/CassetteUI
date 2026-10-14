import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EmailPreferenceRequestError,
  readEmailPreferencesResponse,
} from '../email-preferences-contract';

const off = {
  enabled: false,
  consentSource: null,
  consentTextVersion: null,
  consentedAtUtc: null,
  lastChangedSource: null,
  updatedAtUtc: null,
};
const digestOn = {
  enabled: true,
  consentSource: 'settings',
  consentTextVersion: 'curator_digest_v1',
  consentedAtUtc: '2026-10-12T06:00:00Z',
  lastChangedSource: 'settings',
  updatedAtUtc: '2026-10-12T06:00:00Z',
};

const answer = (body: string, status = 200) => new Response(body, { status });

void test('parses both categories and drops unknown fields', async () => {
  const parsed = await readEmailPreferencesResponse(answer(JSON.stringify({
    product_updates: off,
    curator_digest: { ...digestOn, internalNote: 'ignored' },
    extra: true,
  })));

  assert.deepEqual(parsed, { product_updates: off, curator_digest: digestOn });
});

void test('a response without a valid curator digest is a bad gateway, not an off value', async () => {
  for (const body of [
    { product_updates: off },
    { product_updates: off, curator_digest: null },
    { product_updates: off, curator_digest: { ...digestOn, enabled: 'true' } },
    { curator_digest: digestOn },
    null,
  ]) {
    await assert.rejects(readEmailPreferencesResponse(answer(JSON.stringify(body))), new EmailPreferenceRequestError(502));
  }
  await assert.rejects(readEmailPreferencesResponse(answer('not json')), new EmailPreferenceRequestError(502));
});

void test('a failed request keeps its status', async () => {
  await assert.rejects(readEmailPreferencesResponse(answer('', 401)), new EmailPreferenceRequestError(401));
});
