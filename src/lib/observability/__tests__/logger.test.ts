import test from 'node:test';
import assert from 'node:assert/strict';
import { appLogger, redactLogContext } from '../logger';

test('redactLogContext removes sensitive values and raw URLs', () => {
  const redacted = redactLogContext(
    {
      access_token: 'token-value',
      source_url: 'https://open.spotify.com/track/secret',
      query_string: 'code=oauth-code&state=oauth-state',
      cookie: 'session=private',
      description: 'private user text',
      route: '/post/abc',
      error: new Error('Failed https://cassette.app/auth/callback?code=oauth-code&state=oauth-state Bearer abc123'),
      nested: {
        privateKey: 'private-key-value',
        redirect_url: 'https://cassette.app/auth/callback?code=secret',
      },
    },
    { includeDeploymentMetadata: false },
  );

  assert.equal(redacted?.access_token, '[REDACTED]');
  assert.equal(redacted?.source_url, '[REDACTED_URL]');
  assert.equal(redacted?.query_string, '[REDACTED]');
  assert.equal(redacted?.cookie, '[REDACTED]');
  assert.equal(redacted?.description, '[REDACTED]');
  assert.equal(redacted?.route, '/post/abc');
  assert.deepEqual(redacted?.error, {
    name: 'Error',
    message: 'Failed [REDACTED_URL] Bearer [REDACTED]',
  });
  assert.deepEqual(redacted?.nested, {
    privateKey: '[REDACTED]',
    redirect_url: '[REDACTED_URL]',
  });
});

test('appLogger gates debug logs in production unless explicitly enabled', () => {
  const env = process.env as Record<string, string | undefined>;
  const previousNodeEnv = env.NODE_ENV;
  const previousClientLogs = env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS;
  const previousDebug = console.debug;
  const calls: unknown[][] = [];

  console.debug = (...args: unknown[]) => {
    calls.push(args);
  };

  try {
    env.NODE_ENV = 'production';
    delete env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS;

    appLogger.debug('hidden_debug_log', { access_token: 'secret' });
    assert.equal(calls.length, 0);

    env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS = 'true';
    appLogger.debug('visible_debug_log', { access_token: 'secret' });
    assert.equal(calls.length, 1);

    const context = calls[0][1] as Record<string, unknown>;
    assert.equal(context.access_token, '[REDACTED]');
  } finally {
    console.debug = previousDebug;
    if (previousNodeEnv === undefined) {
      delete env.NODE_ENV;
    } else {
      env.NODE_ENV = previousNodeEnv;
    }

    if (previousClientLogs === undefined) {
      delete env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS;
    } else {
      env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS = previousClientLogs;
    }
  }
});
