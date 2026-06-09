import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUiSentryContext, scrubSentryEvent } from '../error-reporting';
import { ERROR_CATEGORIES } from '../fields';

test('buildUiSentryContext normalizes safe request context', () => {
  const previousEnvironment = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;
  const previousRelease = process.env.NEXT_PUBLIC_SENTRY_RELEASE;

  try {
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT = 'production';
    process.env.NEXT_PUBLIC_SENTRY_RELEASE = 'release-123';

    const context = buildUiSentryContext({
      route: 'https://cassette.app/post/abc?token=secret',
      sourcePlatform: 'Apple Music',
      targetPlatforms: ['Spotify', 'Deezer'],
      correlationId: '44444444-4444-4444-4444-444444444444',
      conversionJobId: 'job-123',
      operation: 'source_fetch',
      errorCategory: ERROR_CATEGORIES.auth,
    });

    assert.equal(context.route, '/post/abc');
    assert.equal(context.environment, 'production');
    assert.equal(context.release, 'release-123');
    assert.equal(context.sourcePlatform, 'apple');
    assert.deepEqual(context.targetPlatforms, ['Spotify', 'Deezer']);
    assert.equal(context.correlationId, '44444444-4444-4444-4444-444444444444');
    assert.equal(context.conversionJobId, 'job-123');
    assert.equal(context.operation, 'source_fetch');
    assert.equal(context.errorCategory, ERROR_CATEGORIES.auth);
  } finally {
    if (previousEnvironment === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT = previousEnvironment;
    }

    if (previousRelease === undefined) {
      delete process.env.NEXT_PUBLIC_SENTRY_RELEASE;
    } else {
      process.env.NEXT_PUBLIC_SENTRY_RELEASE = previousRelease;
    }
  }
});

test('scrubSentryEvent redacts nested event payloads without reshaping the event', () => {
  const event = scrubSentryEvent({
    message: 'boom https://cassette.app/auth/callback?code=secret&state=private',
    request: {
      url: 'https://cassette.app/post/abc?token=secret',
      query_string: 'code=secret&state=private',
      data: {
        description: 'private user text',
      },
      headers: {
        authorization: 'Bearer secret',
        cookie: 'session=private',
      },
    },
    contexts: {
      callback: {
        redirect_url: 'https://cassette.app/auth/callback?code=secret',
      },
    },
    extra: {
      accessToken: 'secret',
      route: '/post/abc',
    },
    exception: {
      values: [
        {
          type: 'Error',
          value: 'failed https://cassette.app/api/music/search?access_token=secret Bearer abc123',
        },
      ],
    },
    breadcrumbs: [
      {
        message: 'callback https://cassette.app/auth/callback?code=secret',
        data: {
          payload: { code: 'secret' },
          route: '/auth/callback',
        },
      },
    ],
  });

  assert.equal(event.message, 'boom [REDACTED_URL]');
  assert.equal((event.request as Record<string, unknown>).url, '[REDACTED_URL]');
  assert.equal((event.request as Record<string, unknown>).query_string, '[REDACTED]');
  assert.equal((event.request as Record<string, unknown>).data, '[REDACTED]');
  assert.deepEqual((event.request as { headers: Record<string, unknown> }).headers, {
    authorization: '[REDACTED]',
    cookie: '[REDACTED]',
  });
  assert.deepEqual((event.contexts as { callback: Record<string, unknown> }).callback, {
    redirect_url: '[REDACTED_URL]',
  });
  assert.equal((event.extra as Record<string, unknown>).accessToken, '[REDACTED]');
  assert.equal((event.extra as Record<string, unknown>).route, '/post/abc');
  assert.deepEqual((event.exception as { values: unknown[] }).values, [
    {
      type: 'Error',
      value: 'failed [REDACTED_URL] Bearer [REDACTED]',
    },
  ]);
  assert.deepEqual(event.breadcrumbs, [
    {
      message: 'callback [REDACTED_URL]',
      data: '[REDACTED]',
    },
  ]);
  assert.equal((event as Record<string, unknown>).service, undefined);
});
