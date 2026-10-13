import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  AMAZON_MUSIC_HOST_TERRITORIES,
  type ParsedAmazonMusicLink,
  buildAmazonMusicUrl,
  isAmazonMusicHostname,
  normalizeAmazonAsin,
  parseAmazonMusicLink,
} from '../amazon-music-link';
import { isSupportedMusicLink } from '../music-link-input';

type MatrixCase = {
  name: string;
  input: string;
  expected?: ParsedAmazonMusicLink;
  expectedError?: string;
};

type Matrix = {
  contractVersion: number;
  rules: { hosts: Record<string, string>; codes: Record<string, string> };
  cases: MatrixCase[];
};

const matrixPath = path.join(
  process.cwd(),
  'contract-fixtures',
  'amazon-music',
  'v1',
  'amazon-music-link-matrix.v1.json',
);
// SAFETY: the fixture is a checked-in v1 contract file whose shape the first test below asserts
// (contractVersion and a non-empty cases array); any drift fails that test before the cases run.
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8')) as Matrix;

test('amazon-music link matrix is the v1 contract', () => {
  assert.equal(matrix.contractVersion, 1);
  assert.ok(matrix.cases.length >= 40);
});

for (const matrixCase of matrix.cases) {
  test(`amazon-music link matrix: ${matrixCase.name}`, () => {
    const result = parseAmazonMusicLink(matrixCase.input);
    if (matrixCase.expectedError) {
      assert.equal(result.ok, false, `expected ${matrixCase.expectedError}`);
      if (!result.ok) assert.equal(result.code, matrixCase.expectedError);
      return;
    }
    assert.equal(result.ok, true, `expected a parsed link for ${matrixCase.name}`);
    if (result.ok) assert.deepEqual(result.link, matrixCase.expected);
  });
}

test('every documented error code has at least one matrix case', () => {
  const seen = new Set(matrix.cases.flatMap((c) => (c.expectedError ? [c.expectedError] : [])));
  const byName = (a: string, b: string) => a.localeCompare(b);
  assert.deepEqual([...seen].sort(byName), Object.keys(matrix.rules.codes).sort(byName));
});

test('host table matches the matrix rules', () => {
  assert.deepEqual(AMAZON_MUSIC_HOST_TERRITORIES, matrix.rules.hosts);
  assert.equal(isAmazonMusicHostname('MUSIC.AMAZON.COM'), true);
  assert.equal(isAmazonMusicHostname('www.music.amazon.co.uk'), true);
  assert.equal(isAmazonMusicHostname('amazon.com'), false);
  assert.equal(isAmazonMusicHostname('music.amazon.com.evil.example'), false);
});

test('normalizeAmazonAsin applies the ASIN rule', () => {
  assert.equal(normalizeAmazonAsin('b07lcdpn6l'), 'B07LCDPN6L');
  assert.equal(normalizeAmazonAsin(' B07LCDPN6L '), 'B07LCDPN6L');
  assert.equal(normalizeAmazonAsin('B07LCDPN6'), null);
  assert.equal(normalizeAmazonAsin('A07LCDPN6L'), null);
  assert.equal(normalizeAmazonAsin('B0064UP%2E4G'), null);
  assert.equal(normalizeAmazonAsin(undefined), null);
});

test('buildAmazonMusicUrl constructs canonical links', () => {
  assert.equal(buildAmazonMusicUrl('track', 'B07LCDPN6L'), 'https://music.amazon.com/tracks/B07LCDPN6L');
  assert.equal(buildAmazonMusicUrl('album', 'B0064UPU4G'), 'https://music.amazon.com/albums/B0064UPU4G');
  assert.equal(buildAmazonMusicUrl('artist', 'B000QJPQ7U'), 'https://music.amazon.com/artists/B000QJPQ7U');
  assert.equal(
    buildAmazonMusicUrl('playlist', 'B07PZMR9PY', 'curated'),
    'https://music.amazon.com/playlists/B07PZMR9PY',
  );
  assert.equal(
    buildAmazonMusicUrl('playlist', '9f1c0c2d6f3a4b8e9d0c1b2a3f4e5d6c', 'user'),
    'https://music.amazon.com/user-playlists/9f1c0c2d6f3a4b8e9d0c1b2a3f4e5d6c',
  );
});

test('parsed links never carry query parameters', () => {
  const result = parseAmazonMusicLink('https://music.amazon.com/tracks/B07LCDPN6L?ref=secret_share_token');
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

test('current music-link input still treats Amazon Music as unsupported until the rollout gate opens', () => {
  // Guard for #23: this assertion flips when Amazon Music becomes an active platform.
  assert.equal(isSupportedMusicLink('https://music.amazon.com/tracks/B07LCDPN6L'), false);
});
