import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fetchHostedBridgeFromAmplify,
  fetchHostedSupabaseFromAws,
  hasHostedBridgeEnvironment,
  hasHostedSupabaseEnvironment,
  resolveHostedAwsSettings,
} from '../local-dev-config.mjs';


test('hosted AWS settings reuse the adjacent Bridge launcher choices', () => {
  assert.deepEqual(
    resolveHostedAwsSettings({}, {
      aws_profile: 'cassette-dev',
      aws_region: 'us-east-1',
      secret_id: 'BridgeServiceSecrets',
    }, {}),
    {
      profile: 'cassette-dev',
      region: 'us-east-1',
      secretId: 'BridgeServiceSecrets',
      amplifyAppName: 'CassetteUI',
    },
  );
});

test('hosted Bridge environment rejects the standard local URL', () => {
  const useful = (value) => Boolean(value);
  assert.equal(hasHostedBridgeEnvironment({
    NEXT_PUBLIC_API_URL: 'http://localhost:5001',
  }, useful), false);
});

test('Amplify app configuration supplies the canonical hosted Bridge URL', () => {
  const responses = [
    {
      status: 0,
      stdout: JSON.stringify({ apps: [{ name: 'CassetteUI', appId: 'app-id' }] }),
    },
    {
      status: 0,
      stdout: JSON.stringify({
        app: { environmentVariables: { NEXT_PUBLIC_API_URL: 'https://bridge.example.test' } },
      }),
    },
  ];
  const calls = [];
  const run = (command, args, options) => {
    calls.push({ command, args, options });
    return responses.shift();
  };

  const result = fetchHostedBridgeFromAmplify({
    profile: 'cassette-dev',
    region: 'us-east-1',
    amplifyAppName: 'CassetteUI',
  }, run);

  assert.deepEqual(result, { ok: true, bridgeUrl: 'https://bridge.example.test' });
  assert.equal(calls.length, 2);
  assert.ok(calls[1].args.includes('app-id'));
  assert.equal(calls[1].options.shell, false);
});

test('hosted environment rejects values overwritten by local Supabase', () => {
  const useful = (value) => Boolean(value);
  assert.equal(hasHostedSupabaseEnvironment({
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:55321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'local-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'local-service-role',
  }, useful), false);
});

test('AWS secret values map to the UI hosted Supabase configuration', () => {
  const calls = [];
  const run = (command, args, options) => {
    calls.push({ command, args, options });
    return {
      status: 0,
      stdout: JSON.stringify({
        SUPABASE_URL: 'https://project.supabase.co',
        SUPABASE_ANON_KEY: 'anon-value',
        SUPABASE_SERVICE_ROLE_KEY: 'service-value',
      }),
    };
  };

  const result = fetchHostedSupabaseFromAws({
    profile: 'cassette-dev',
    region: 'us-east-1',
    secretId: 'BridgeServiceSecrets',
  }, run);

  assert.equal(result.ok, true);
  assert.deepEqual(result.values, {
    supabaseUrl: 'https://project.supabase.co',
    anonKey: 'anon-value',
    serviceRoleKey: 'service-value',
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.shell, false);
  assert.ok(calls[0].args.includes('BridgeServiceSecrets'));
});

test('AWS secret retrieval fails without exposing partial secret values', () => {
  const result = fetchHostedSupabaseFromAws({
    profile: 'cassette-dev',
    region: 'us-east-1',
    secretId: 'BridgeServiceSecrets',
  }, () => ({
    status: 0,
    stdout: JSON.stringify({ SUPABASE_URL: 'https://project.supabase.co' }),
  }));

  assert.equal(result.ok, false);
  assert.match(result.reason, /SUPABASE_ANON_KEY/);
  assert.doesNotMatch(result.reason, /project\.supabase\.co/);
});
