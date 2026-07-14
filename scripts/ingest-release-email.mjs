import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const EXPECTED_REPOSITORY = 'CassetteTech/CassetteUI';
export const RELEASE_SECRET_HEADER = 'X-Cassette-Release-Secret';
export const BRIDGE_RELEASE_PATH = '/api/v1/internal/email/releases';
export const MAX_BATCHES = 400;

const GITHUB_API_ORIGIN = 'https://api.github.com';
const MAX_TITLE_LENGTH = 160;
const MAX_SUMMARY_LENGTH = 1_000;
const MAX_RELEASE_URL_LENGTH = 2_048;
const BRIDGE_BATCH_SIZE = 25;
const SUMMARY_ALLOWED_CONTROL_CODE_POINTS = new Set([0x09, 0x0a, 0x0d]);

function hasForbiddenControlCharacter(value, allowedCodePoints = new Set()) {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    const isControl = codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
    if (isControl && !allowedCodePoints.has(codePoint)) {
      return true;
    }
  }
  return false;
}

function requiredValue(environment, name) {
  const value = environment[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required ${name}.`);
  }
  return value;
}

function parseReleaseId(value) {
  if (!/^[1-9][0-9]*$/u.test(value)) {
    throw new Error('release_id must be a positive numeric GitHub release ID.');
  }

  const releaseId = Number(value);
  if (!Number.isSafeInteger(releaseId)) {
    throw new Error('release_id is outside the supported numeric range.');
  }
  return releaseId;
}

function validateSummary(summary) {
  if (
    summary.length === 0 ||
    summary.length > MAX_SUMMARY_LENGTH ||
    summary.trim() !== summary ||
    hasForbiddenControlCharacter(summary, SUMMARY_ALLOWED_CONTROL_CODE_POINTS)
  ) {
    throw new Error('curated_summary must be trimmed, non-empty, and at most 1000 characters.');
  }
  return summary;
}

function validateTitle(title) {
  if (
    typeof title !== 'string' ||
    title.length === 0 ||
    title.length > MAX_TITLE_LENGTH ||
    title.trim() !== title ||
    hasForbiddenControlCharacter(title) ||
    title.includes('\u2028') ||
    title.includes('\u2029')
  ) {
    throw new Error('The published release must have a valid GitHub release name.');
  }
  return title;
}

function validateReleaseUrl(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > MAX_RELEASE_URL_LENGTH ||
    value.trim() !== value
  ) {
    throw new Error('The GitHub release URL is invalid.');
  }

  let releaseUrl;
  try {
    releaseUrl = new URL(value);
  } catch {
    throw new Error('The GitHub release URL is invalid.');
  }

  const pathPrefix = `/${EXPECTED_REPOSITORY}/releases/tag/`;
  const encodedTag = releaseUrl.pathname.slice(pathPrefix.length);
  if (
    releaseUrl.protocol !== 'https:' ||
    releaseUrl.hostname !== 'github.com' ||
    releaseUrl.port !== '' ||
    releaseUrl.username !== '' ||
    releaseUrl.password !== '' ||
    releaseUrl.search !== '' ||
    releaseUrl.hash !== '' ||
    !releaseUrl.pathname.startsWith(pathPrefix) ||
    encodedTag.length === 0 ||
    encodedTag.includes('/')
  ) {
    throw new Error('The GitHub release URL does not match the CassetteUI release contract.');
  }
  return value;
}

function bridgeReleaseUrl(value) {
  let endpoint;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error('CASSETTE_BRIDGE_RELEASE_INGESTION_URL must be a valid HTTPS URL.');
  }

  if (
    value.trim() !== value ||
    endpoint.protocol !== 'https:' ||
    endpoint.username !== '' ||
    endpoint.password !== '' ||
    endpoint.port !== '' ||
    endpoint.pathname !== BRIDGE_RELEASE_PATH ||
    endpoint.search !== '' ||
    endpoint.hash !== ''
  ) {
    throw new Error(
      `CASSETTE_BRIDGE_RELEASE_INGESTION_URL must be an HTTPS URL ending in ${BRIDGE_RELEASE_PATH}.`,
    );
  }
  return endpoint.href;
}

async function readJson(response, source) {
  try {
    return await response.json();
  } catch {
    throw new Error(`${source} returned invalid JSON.`);
  }
}

function validateRelease(release, releaseId) {
  if (!release || typeof release !== 'object' || Array.isArray(release)) {
    throw new Error('GitHub returned an invalid release response.');
  }
  if (release.id !== releaseId) {
    throw new Error('GitHub returned a mismatched release ID.');
  }

  const expectedApiUrl = `${GITHUB_API_ORIGIN}/repos/${EXPECTED_REPOSITORY}/releases/${releaseId}`;
  if (release.url !== expectedApiUrl) {
    throw new Error('GitHub returned a release from a mismatched repository.');
  }
  if (release.draft !== false || typeof release.published_at !== 'string') {
    throw new Error('The selected GitHub release is draft or unpublished.');
  }
  if (!Number.isFinite(Date.parse(release.published_at))) {
    throw new Error('The selected GitHub release has an invalid publication timestamp.');
  }

  return {
    title: validateTitle(release.name),
    releaseUrl: validateReleaseUrl(release.html_url),
  };
}

function nonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validateBatchResponse(value, releaseId, previous) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Bridge returned an invalid release-ingestion response.');
  }

  const validStatus = value.status === 'processing' || value.status === 'completed';
  if (
    value.repository !== EXPECTED_REPOSITORY ||
    value.githubReleaseId !== releaseId ||
    !validStatus ||
    !nonNegativeInteger(value.scannedThisBatch) ||
    !nonNegativeInteger(value.enqueuedThisBatch) ||
    !nonNegativeInteger(value.scannedTotal) ||
    !nonNegativeInteger(value.enqueuedTotal) ||
    typeof value.completed !== 'boolean' ||
    value.scannedThisBatch > BRIDGE_BATCH_SIZE ||
    value.enqueuedThisBatch > value.scannedThisBatch ||
    value.enqueuedTotal > value.scannedTotal ||
    value.scannedTotal < value.scannedThisBatch ||
    value.enqueuedTotal < value.enqueuedThisBatch ||
    value.completed !== (value.status === 'completed')
  ) {
    throw new Error('Bridge returned an invalid release-ingestion response.');
  }

  if (
    previous &&
    (value.scannedTotal !== previous.scannedTotal + value.scannedThisBatch ||
      value.enqueuedTotal !== previous.enqueuedTotal + value.enqueuedThisBatch)
  ) {
    throw new Error('Bridge returned non-monotonic release-ingestion totals.');
  }
  if (!value.completed && value.scannedThisBatch === 0) {
    throw new Error('Bridge release ingestion made no progress.');
  }

  return value;
}

export async function runReleaseEmailIngestion({
  environment = process.env,
  fetchImpl = globalThis.fetch,
  log = console.log,
  maxBatches = MAX_BATCHES,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required.');
  }
  if (!Number.isInteger(maxBatches) || maxBatches < 1 || maxBatches > MAX_BATCHES) {
    throw new Error(`maxBatches must be between 1 and ${MAX_BATCHES}.`);
  }
  if (requiredValue(environment, 'GITHUB_REPOSITORY') !== EXPECTED_REPOSITORY) {
    throw new Error('This workflow may run only in CassetteTech/CassetteUI.');
  }
  if (requiredValue(environment, 'GITHUB_API_URL') !== GITHUB_API_ORIGIN) {
    throw new Error('This workflow requires the public GitHub API origin.');
  }

  const releaseId = parseReleaseId(requiredValue(environment, 'RELEASE_ID_INPUT'));
  const summary = validateSummary(requiredValue(environment, 'CURATED_SUMMARY'));
  const githubToken = requiredValue(environment, 'GITHUB_TOKEN');
  const releaseSecret = requiredValue(environment, 'CASSETTE_RELEASE_INGESTION_SECRET');
  if (/\r|\n/u.test(githubToken) || /\r|\n/u.test(releaseSecret)) {
    throw new Error('Authentication secrets must not contain line breaks.');
  }
  const endpoint = bridgeReleaseUrl(
    requiredValue(environment, 'CASSETTE_BRIDGE_RELEASE_INGESTION_URL'),
  );

  const githubResponse = await fetchImpl(
    `${GITHUB_API_ORIGIN}/repos/${EXPECTED_REPOSITORY}/releases/${releaseId}`,
    {
      method: 'GET',
      redirect: 'error',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${githubToken}`,
        'User-Agent': 'CassetteUI-release-email-workflow',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!githubResponse.ok) {
    throw new Error(`GitHub release lookup failed with status ${githubResponse.status}.`);
  }

  const release = validateRelease(await readJson(githubResponse, 'GitHub'), releaseId);
  const requestBody = JSON.stringify({
    repository: EXPECTED_REPOSITORY,
    githubReleaseId: releaseId,
    published: true,
    draft: false,
    title: release.title,
    summary,
    releaseUrl: release.releaseUrl,
  });

  let previous = null;
  for (let batch = 1; batch <= maxBatches; batch += 1) {
    const bridgeResponse = await fetchImpl(endpoint, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [RELEASE_SECRET_HEADER]: releaseSecret,
      },
      body: requestBody,
      signal: AbortSignal.timeout(30_000),
    });
    if (!bridgeResponse.ok) {
      throw new Error(`Bridge release ingestion failed with status ${bridgeResponse.status}.`);
    }

    const result = validateBatchResponse(
      await readJson(bridgeResponse, 'Bridge'),
      releaseId,
      previous,
    );
    if (result.completed) {
      log(
        `batches=${batch} scanned_total=${result.scannedTotal} enqueued_total=${result.enqueuedTotal}`,
      );
      return result;
    }
    previous = result;
  }

  const counts = previous
    ? ` scanned_total=${previous.scannedTotal} enqueued_total=${previous.enqueuedTotal}`
    : '';
  throw new Error(`Release ingestion exceeded ${maxBatches} batches.${counts}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runReleaseEmailIngestion().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Release ingestion failed.');
    process.exitCode = 1;
  });
}
