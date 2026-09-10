import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync } from 'node:crypto';

import {
  fetchHostedBridgeFromAmplify,
  fetchMusicCredentialsFromAws,
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

test('music secrets map required credentials and reject invalid input without exposing values', () => {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const settings = { profile: 'cassette-dev', region: 'us-east-1' };
  const secrets = {
    AppleMusicLambdaSecrets: { am_secret_key: pem, am_key_id: 'key-id', am_team_id: 'team-id' },
    SpotifyLambdaSecrets: {
      spotify_client_id: 'client-id', spotify_client_secret: 'client-secret',
      cassette_spotify_refresh_token: 'must-not-copy',
    },
  };
  const run = (command, args, options) => {
    assert.equal(options.shell, false);
    assert.equal(args[args.indexOf('--profile') + 1], 'cassette-dev');
    return { status: 0, stdout: JSON.stringify(secrets[args[args.indexOf('--secret-id') + 1]]) };
  };
  for (const encoded of [pem, pem.replaceAll('\n', '\\n')]) {
    secrets.AppleMusicLambdaSecrets.am_secret_key = encoded;
    assert.deepEqual(fetchMusicCredentialsFromAws(settings, run), { ok: true, values: {
      APPLE_MUSIC_PRIVATE_KEY: pem.trim(), APPLE_MUSIC_KEY_ID: 'key-id', APPLE_MUSIC_TEAM_ID: 'team-id',
      SPOTIFY_CLIENT_ID: 'client-id', SPOTIFY_CLIENT_SECRET: 'client-secret',
    } });
  }
  secrets.AppleMusicLambdaSecrets.am_secret_key = 'invalid-private-key';
  const invalid = fetchMusicCredentialsFromAws(settings, run);
  assert.equal(invalid.ok, false);
  assert.doesNotMatch(invalid.reason, /invalid-private-key/);
  delete secrets.SpotifyLambdaSecrets.spotify_client_secret;
  assert.match(fetchMusicCredentialsFromAws(settings, run).reason, /spotify_client_secret/);
  const failed = fetchMusicCredentialsFromAws(settings, () => ({ status: 1, stderr: 'sensitive-output' }));
  assert.equal(failed.ok, false);
  assert.doesNotMatch(failed.reason, /sensitive-output/);
  assert.equal(fetchMusicCredentialsFromAws(settings, () => ({ status: 0, stdout: '{' })).ok, false);
});
