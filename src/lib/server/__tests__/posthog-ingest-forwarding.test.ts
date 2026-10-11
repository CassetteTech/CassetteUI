import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildUpstreamCaptureHeaders,
  enrichCapturePayload,
  parseCloudFrontViewerAddress,
  parseForwardedForEntry,
  parseUserAgent,
  resolveClientIp,
  resolveIngestClientContext,
} from '../posthog-ingest-forwarding';

const IPHONE_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const MAC_CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const WINDOWS_EDGE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0';
const ANDROID_CHROME_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const ANDROID_TABLET_UA =
  'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const LINUX_FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0';

test('parses IPv4 and unbracketed IPv6 cloudfront-viewer-address values', () => {
  assert.equal(parseCloudFrontViewerAddress('203.0.113.10:51234'), '203.0.113.10');
  assert.equal(parseCloudFrontViewerAddress('2001:db8:85a3::8a2e:370:7334:443'), '2001:db8:85a3::8a2e:370:7334');
  assert.equal(parseCloudFrontViewerAddress('[2001:db8::1]:443'), '2001:db8::1');
  assert.equal(parseCloudFrontViewerAddress('::ffff:198.51.100.7:8080'), '198.51.100.7');
});

test('rejects malformed cloudfront-viewer-address values', () => {
  assert.equal(parseCloudFrontViewerAddress(undefined), undefined);
  assert.equal(parseCloudFrontViewerAddress(''), undefined);
  assert.equal(parseCloudFrontViewerAddress('203.0.113.10'), undefined);
  assert.equal(parseCloudFrontViewerAddress('not-an-ip:443'), undefined);
  assert.equal(parseCloudFrontViewerAddress('999.1.1.1:443'), undefined);
});

test('parses bare and port-suffixed x-forwarded-for entries', () => {
  assert.equal(parseForwardedForEntry(' 198.51.100.7 '), '198.51.100.7');
  assert.equal(parseForwardedForEntry('198.51.100.7:1234'), '198.51.100.7');
  assert.equal(parseForwardedForEntry('2001:db8::1'), '2001:db8::1');
  assert.equal(parseForwardedForEntry('[2001:db8::1]:443'), '2001:db8::1');
  assert.equal(parseForwardedForEntry('unknown'), undefined);
});

test('prefers cloudfront-viewer-address over x-forwarded-for', () => {
  const headers = new Headers({
    'cloudfront-viewer-address': '203.0.113.10:51234',
    'x-forwarded-for': '1.1.1.1, 70.132.0.1',
  });
  assert.equal(resolveClientIp(headers), '203.0.113.10');
});

test('falls back to the first x-forwarded-for entry', () => {
  const headers = new Headers({ 'x-forwarded-for': '198.51.100.7, 70.132.0.1' });
  assert.equal(resolveClientIp(headers), '198.51.100.7');

  const invalidCloudFront = new Headers({
    'cloudfront-viewer-address': 'garbage',
    'x-forwarded-for': '198.51.100.7',
  });
  assert.equal(resolveClientIp(invalidCloudFront), '198.51.100.7');
});

test('returns no client context when headers are missing', () => {
  assert.deepEqual(resolveIngestClientContext(new Headers()), { ip: undefined, userAgent: undefined });
});

test('maps common user agents to posthog-js property values', () => {
  assert.deepEqual(parseUserAgent(IPHONE_SAFARI_UA), { browser: 'Mobile Safari', os: 'iOS', deviceType: 'Mobile' });
  assert.deepEqual(parseUserAgent(MAC_CHROME_UA), { browser: 'Chrome', os: 'Mac OS X', deviceType: 'Desktop' });
  assert.deepEqual(parseUserAgent(WINDOWS_EDGE_UA), { browser: 'Microsoft Edge', os: 'Windows', deviceType: 'Desktop' });
  assert.deepEqual(parseUserAgent(ANDROID_CHROME_UA), { browser: 'Chrome', os: 'Android', deviceType: 'Mobile' });
  assert.deepEqual(parseUserAgent(ANDROID_TABLET_UA), { browser: 'Chrome', os: 'Android', deviceType: 'Tablet' });
  assert.deepEqual(parseUserAgent(LINUX_FIREFOX_UA), { browser: 'Firefox', os: 'Linux', deviceType: 'Desktop' });
  assert.deepEqual(parseUserAgent('curl/8.4.0'), { browser: undefined, os: undefined, deviceType: undefined });
});

test('enriches a single capture event without changing its shape', () => {
  const body = JSON.stringify({
    api_key: 'phc_test',
    event: '$pageview',
    distinct_id: 'anon:1',
    properties: { $lib: 'cassette-ui', route: '/', $ip: '6.6.6.6' },
  });

  const enriched = JSON.parse(enrichCapturePayload(body, { ip: '203.0.113.10', userAgent: IPHONE_SAFARI_UA }));

  assert.deepEqual(enriched, {
    api_key: 'phc_test',
    event: '$pageview',
    distinct_id: 'anon:1',
    properties: {
      $lib: 'cassette-ui',
      route: '/',
      $ip: '203.0.113.10',
      $raw_user_agent: IPHONE_SAFARI_UA,
      $browser: 'Mobile Safari',
      $os: 'iOS',
      $device_type: 'Mobile',
    },
  });
});

test('keeps client-provided device properties and adds properties when absent', () => {
  const body = JSON.stringify({ api_key: 'phc_test', event: 'x', distinct_id: 'u', properties: { $browser: 'Custom' } });
  const enriched = JSON.parse(enrichCapturePayload(body, { userAgent: MAC_CHROME_UA }));
  assert.equal(enriched.properties.$browser, 'Custom');
  assert.equal(enriched.properties.$os, 'Mac OS X');
  assert.equal(enriched.properties.$ip, undefined);

  const noProps = JSON.parse(enrichCapturePayload(JSON.stringify({ event: 'x' }), { ip: '198.51.100.7' }));
  assert.deepEqual(noProps, { event: 'x', properties: { $ip: '198.51.100.7' } });
});

test('enriches every event in a batch payload', () => {
  const body = JSON.stringify({ api_key: 'phc_test', batch: [{ event: 'a', properties: {} }, { event: 'b' }] });
  const enriched = JSON.parse(enrichCapturePayload(body, { ip: '198.51.100.7' }));
  assert.equal(enriched.api_key, 'phc_test');
  assert.deepEqual(
    enriched.batch.map((event: { properties: { $ip: string } }) => event.properties.$ip),
    ['198.51.100.7', '198.51.100.7'],
  );
});

test('returns the original body when it cannot be enriched', () => {
  assert.equal(enrichCapturePayload('not json', { ip: '198.51.100.7' }), 'not json');
  assert.equal(enrichCapturePayload('[1,2]', { ip: '198.51.100.7' }), '[1,2]');

  const nonObjectProps = JSON.stringify({ event: 'x', properties: 'oops' });
  assert.equal(JSON.parse(enrichCapturePayload(nonObjectProps, { ip: '198.51.100.7' })).properties, 'oops');

  const original = '{"event":"x"}';
  assert.equal(enrichCapturePayload(original, {}), original);
});

test('builds upstream headers with the client IP and user agent', () => {
  const headers = buildUpstreamCaptureHeaders({ ip: '203.0.113.10', userAgent: MAC_CHROME_UA });
  assert.deepEqual(Object.fromEntries(headers), {
    'content-type': 'application/json',
    'x-forwarded-for': '203.0.113.10',
    'user-agent': MAC_CHROME_UA,
  });
  assert.deepEqual(Object.fromEntries(buildUpstreamCaptureHeaders({})), { 'content-type': 'application/json' });
});
