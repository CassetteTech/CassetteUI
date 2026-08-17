import fs from 'node:fs';
import process from 'node:process';
import { spawnSync } from 'node:child_process';


const REQUIRED_HOSTED_SUPABASE_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

export function loadJsonObject(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export function resolveHostedAwsSettings(previous = {}, bridgeState = {}, environment = process.env) {
  return {
    profile: previous.awsProfile || bridgeState.aws_profile || environment.AWS_PROFILE || 'cassette-dev',
    region: previous.awsRegion || bridgeState.aws_region || environment.AWS_REGION || environment.AWS_DEFAULT_REGION || 'us-east-1',
    secretId: previous.bridgeSecretId || bridgeState.secret_id || environment.SECRETS_MANAGER_SECRET_ID || 'BridgeServiceSecrets',
    amplifyAppName: previous.amplifyAppName || environment.CASSETTE_UI_AMPLIFY_APP_NAME || 'CassetteUI',
  };
}

export function isLocalSupabaseUrl(value) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function hasHostedSupabaseEnvironment(values, useful) {
  return useful(values.NEXT_PUBLIC_SUPABASE_URL)
    && !isLocalSupabaseUrl(values.NEXT_PUBLIC_SUPABASE_URL)
    && useful(values.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    && useful(values.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasHostedBridgeEnvironment(values, useful) {
  return useful(values.NEXT_PUBLIC_API_URL) && !isLocalSupabaseUrl(values.NEXT_PUBLIC_API_URL);
}

export function fetchHostedBridgeFromAmplify(settings, run = spawnSync) {
  const command = process.platform === 'win32' ? 'aws.exe' : 'aws';
  const options = {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  };
  const appsResult = run(command, [
    'amplify', 'list-apps',
    '--profile', settings.profile,
    '--region', settings.region,
    '--output', 'json',
  ], options);
  if (appsResult.error || appsResult.status !== 0) {
    return { ok: false, reason: `AWS profile ${settings.profile} could not list Amplify apps.` };
  }
  try {
    const apps = JSON.parse(appsResult.stdout).apps;
    const app = Array.isArray(apps)
      ? apps.find((candidate) => candidate?.name === settings.amplifyAppName)
      : null;
    if (!app?.appId) {
      return { ok: false, reason: `Amplify app ${settings.amplifyAppName} was not found.` };
    }
    const appResult = run(command, [
      'amplify', 'get-app',
      '--app-id', app.appId,
      '--profile', settings.profile,
      '--region', settings.region,
      '--output', 'json',
    ], options);
    if (appResult.error || appResult.status !== 0) {
      return { ok: false, reason: `AWS profile ${settings.profile} could not read Amplify app ${settings.amplifyAppName}.` };
    }
    const bridgeUrl = JSON.parse(appResult.stdout)?.app?.environmentVariables?.NEXT_PUBLIC_API_URL;
    if (typeof bridgeUrl !== 'string' || !bridgeUrl.trim() || isLocalSupabaseUrl(bridgeUrl)) {
      return { ok: false, reason: `Amplify app ${settings.amplifyAppName} does not contain a hosted NEXT_PUBLIC_API_URL.` };
    }
    return { ok: true, bridgeUrl: bridgeUrl.trim() };
  } catch {
    return { ok: false, reason: `Amplify app ${settings.amplifyAppName} returned invalid configuration.` };
  }
}

export function fetchHostedSupabaseFromAws(settings, run = spawnSync) {
  const command = process.platform === 'win32' ? 'aws.exe' : 'aws';
  const result = run(command, [
    'secretsmanager', 'get-secret-value',
    '--secret-id', settings.secretId,
    '--profile', settings.profile,
    '--region', settings.region,
    '--query', 'SecretString',
    '--output', 'text',
  ], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    return { ok: false, reason: `AWS profile ${settings.profile} could not read ${settings.secretId}.` };
  }
  try {
    const secret = JSON.parse(result.stdout);
    const missing = REQUIRED_HOSTED_SUPABASE_KEYS.filter(
      (key) => typeof secret[key] !== 'string' || !secret[key].trim(),
    );
    if (missing.length) {
      return { ok: false, reason: `${settings.secretId} is missing: ${missing.join(', ')}.` };
    }
    if (isLocalSupabaseUrl(secret.SUPABASE_URL)) {
      return { ok: false, reason: `${settings.secretId} contains a local Supabase URL instead of a hosted project.` };
    }
    return {
      ok: true,
      values: {
        supabaseUrl: secret.SUPABASE_URL,
        anonKey: secret.SUPABASE_ANON_KEY,
        serviceRoleKey: secret.SUPABASE_SERVICE_ROLE_KEY,
      },
    };
  } catch {
    return { ok: false, reason: `${settings.secretId} did not return a valid JSON secret.` };
  }
}
