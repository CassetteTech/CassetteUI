#!/usr/bin/env node

import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  fetchHostedBridgeFromAmplify,
  fetchHostedSupabaseFromAws,
  hasHostedBridgeEnvironment,
  hasHostedSupabaseEnvironment,
  loadJsonObject,
  resolveHostedAwsSettings,
} from './local-dev-config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_DIR = path.join(ROOT, '.local-dev');
const STATE_FILE = path.join(LOCAL_DIR, 'state.json');
const ENV_FILE = path.join(ROOT, '.env.local');
const BRIDGE_STATE_FILE = path.join(ROOT, '..', 'CassetteBridge', '.local-dev', 'state.json');
const LOCAL_UI_ORIGIN = 'http://local.cassette.tech:3000';
const LOCAL_BRIDGE_ORIGIN = 'http://localhost:5001';
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:55321';
const LOCAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
let rl;

function input() {
  return rl ??= readline.createInterface({ input: process.stdin, output: process.stdout });
}

const info = (message) => console.log(`[info] ${message}`);
const ok = (message) => console.log(`[ ok ] ${message}`);
const warn = (message) => console.warn(`[warn] ${message}`);
const fail = (message) => console.error(`[fail] ${message}`);

function loadState() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return state && typeof state === 'object' ? state : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
  ok('Saved non-secret run choices to .local-dev/state.json.');
}

function parseEnv() {
  const values = {};
  if (!fs.existsSync(ENV_FILE)) return values;
  for (const raw of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    if (!raw || raw.trimStart().startsWith('#') || !raw.includes('=')) continue;
    const index = raw.indexOf('=');
    const key = raw.slice(0, index).trim();
    let value = raw.slice(index + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function writeEnv(updates) {
  let lines = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/) : [];
  const remaining = new Map(Object.entries(updates));
  lines = lines.map((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (!match || !remaining.has(match[1])) return line;
    const value = remaining.get(match[1]);
    remaining.delete(match[1]);
    return `${match[1]}=${JSON.stringify(value)}`;
  });
  if (remaining.size > 0) {
    if (lines.length && lines.at(-1) !== '') lines.push('');
    lines.push('# Managed by scripts/local-dev.mjs');
    for (const [key, value] of remaining) lines.push(`${key}=${JSON.stringify(value)}`);
  }
  while (lines.length > 1 && lines.at(-1) === '' && lines.at(-2) === '') lines.pop();
  fs.writeFileSync(ENV_FILE, `${lines.join('\n').replace(/\n+$/, '')}\n`);
  ok('Updated ignored .env.local without changing unrelated values.');
}

async function choose(prompt, options, defaultValue) {
  console.log(`\n${prompt}`);
  options.forEach(([value, label], index) => {
    console.log(`  ${index + 1}. ${label}${value === defaultValue ? ' (default)' : ''}`);
  });
  while (true) {
    const answer = (await input().question('> ')).trim();
    if (!answer) return defaultValue;
    const index = Number(answer) - 1;
    if (Number.isInteger(index) && options[index]) return options[index][0];
    const exact = options.find(([value]) => value.toLowerCase() === answer.toLowerCase());
    if (exact) return exact[0];
    warn('Choose one of the numbered options.');
  }
}

async function promptText(label, defaultValue = '', required = true) {
  while (true) {
    const answer = (await input().question(`${label}${defaultValue ? ` [${defaultValue}]` : ''}: `)).trim();
    if (answer) return answer;
    if (defaultValue) return defaultValue;
    if (!required) return '';
    warn('A value is required.');
  }
}

async function yesNo(prompt, defaultValue) {
  while (true) {
    const answer = (await input().question(`${prompt} [${defaultValue ? 'Y/n' : 'y/N'}]: `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    if (['y', 'yes'].includes(answer)) return true;
    if (['n', 'no'].includes(answer)) return false;
  }
}

async function secretValue(label, existing, required = true) {
  if (useful(existing)) {
    const keep = await yesNo(`${label} is already set. Keep it?`, true);
    if (keep) return existing;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    warn(`${label} input cannot be masked in this shell.`);
    return promptText(`${label} (saved only to ignored .env.local)`, '', required);
  }
  while (true) {
    rl.close();
    let muted = false;
    const maskedOutput = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    });
    const secretRl = readline.createInterface({ input: process.stdin, output: maskedOutput, terminal: true });
    const answerPromise = secretRl.question(`${label} (saved only to ignored .env.local): `);
    muted = true;
    const answer = (await answerPromise).trim();
    muted = false;
    secretRl.close();
    process.stdout.write('\n');
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (answer || !required) return answer;
    warn('A value is required.');
  }
}

function useful(value) {
  return Boolean(value && !value.includes('your-') && !value.includes('placeholder') && value !== 'undefined' && value !== 'null');
}

async function configure() {
  const previous = loadState() ?? {};
  const current = parseEnv();
  const hostedAwsSettings = resolveHostedAwsSettings(
    previous,
    loadJsonObject(BRIDGE_STATE_FILE),
    process.env,
  );
  console.log('\nCassetteUI local setup');
  console.log('The browser origin is always http://local.cassette.tech:3000 for local OAuth.');

  const bridgeMode = await choose(
    'Which Bridge should the UI use?',
    [['local', 'Local CassetteBridge'], ['hosted', 'Hosted CassetteBridge']],
    previous.bridgeMode ?? 'local',
  );
  let bridgeUrl;
  if (bridgeMode === 'local') {
    bridgeUrl = LOCAL_BRIDGE_ORIGIN;
    ok(`Using the standard local Bridge URL: ${bridgeUrl}`);
  } else {
    if (previous.bridgeMode === 'hosted' && hasHostedBridgeEnvironment(current, useful)) {
      bridgeUrl = current.NEXT_PUBLIC_API_URL;
      ok('Reusing the hosted Bridge URL already stored in ignored .env.local.');
    } else {
      const fetched = fetchHostedBridgeFromAmplify(hostedAwsSettings);
      if (fetched.ok) {
        bridgeUrl = fetched.bridgeUrl;
        ok(`Loaded the hosted Bridge URL from Amplify app ${hostedAwsSettings.amplifyAppName}.`);
      } else if (hasHostedBridgeEnvironment(current, useful)) {
        bridgeUrl = current.NEXT_PUBLIC_API_URL;
        warn(`${fetched.reason} Reusing the hosted Bridge URL already in ignored .env.local.`);
      } else {
        warn(`${fetched.reason} Enter the hosted Bridge URL manually as a fallback.`);
        bridgeUrl = await promptText('Hosted Bridge URL');
      }
    }
  }

  const supabaseMode = await choose(
    'Which Supabase should browser/server helpers use?',
    [['local', 'Local Supabase from CassetteBridge'], ['hosted', 'Hosted Supabase project']],
    previous.supabaseMode ?? 'local',
  );

  let supabaseUrl;
  let anonKey;
  let serviceRoleKey;
  if (supabaseMode === 'local') {
    supabaseUrl = await promptText('Local Supabase URL', LOCAL_SUPABASE_URL);
    anonKey = LOCAL_SUPABASE_ANON_KEY;
    serviceRoleKey = LOCAL_SUPABASE_SERVICE_KEY;
  } else {
    let hostedValues;
    if (previous.supabaseMode === 'hosted' && hasHostedSupabaseEnvironment(current, useful)) {
      hostedValues = {
        supabaseUrl: current.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: current.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceRoleKey: current.SUPABASE_SERVICE_ROLE_KEY,
      };
      ok('Reusing the hosted Supabase settings already stored in ignored .env.local.');
    } else {
      const fetched = fetchHostedSupabaseFromAws(hostedAwsSettings);
      if (fetched.ok) {
        hostedValues = fetched.values;
        ok(`Loaded hosted Supabase settings from ${hostedAwsSettings.secretId} with AWS profile ${hostedAwsSettings.profile}.`);
      } else if (hasHostedSupabaseEnvironment(current, useful)) {
        hostedValues = {
          supabaseUrl: current.NEXT_PUBLIC_SUPABASE_URL,
          anonKey: current.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          serviceRoleKey: current.SUPABASE_SERVICE_ROLE_KEY,
        };
        warn(`${fetched.reason} Reusing the hosted settings already in ignored .env.local.`);
      } else {
        warn(`${fetched.reason} Enter hosted Supabase settings manually as a fallback.`);
      }
    }
    supabaseUrl = hostedValues?.supabaseUrl
      ?? await promptText('Hosted Supabase URL');
    anonKey = hostedValues?.anonKey
      ?? await secretValue('Hosted Supabase anon key', '');
    serviceRoleKey = hostedValues?.serviceRoleKey
      ?? await secretValue('Hosted Supabase service-role key', '');
  }

  const updates = {
    NEXT_PUBLIC_API_URL_LOCAL: bridgeUrl.replace(/\/$/, ''),
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.replace(/\/$/, ''),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    NEXTAUTH_URL: LOCAL_UI_ORIGIN,
    NEXT_PUBLIC_APP_DOMAIN: LOCAL_UI_ORIGIN,
    NEXTAUTH_SECRET: useful(current.NEXTAUTH_SECRET) ? current.NEXTAUTH_SECRET : crypto.randomBytes(32).toString('base64url'),
  };
  if (bridgeMode === 'hosted') updates.NEXT_PUBLIC_API_URL = bridgeUrl.replace(/\/$/, '');

  const directKeys = [
    ['SPOTIFY_CLIENT_ID', 'Spotify client ID', false],
    ['SPOTIFY_CLIENT_SECRET', 'Spotify client secret', true],
    ['APPLE_MUSIC_KEY_ID', 'Apple Music key ID', false],
    ['APPLE_MUSIC_TEAM_ID', 'Apple Music team ID', false],
    ['APPLE_MUSIC_PRIVATE_KEY', 'Apple Music private key (use \\n for newlines)', true],
  ];
  const allDirectPresent = directKeys.every(([key]) => useful(current[key]));
  if (await yesNo('Configure credentials for the UI-owned charts/search API routes?', allDirectPresent)) {
    for (const [key, label, secret] of directKeys) {
      updates[key] = secret
        ? await secretValue(label, current[key])
        : await promptText(label, useful(current[key]) ? current[key] : '');
    }
  }

  writeEnv(updates);
  const state = {
    bridgeMode,
    bridgeUrl: bridgeUrl.replace(/\/$/, ''),
    supabaseMode,
    awsProfile: hostedAwsSettings.profile,
    awsRegion: hostedAwsSettings.region,
    bridgeSecretId: hostedAwsSettings.secretId,
    amplifyAppName: hostedAwsSettings.amplifyAppName,
    installDependencies: await yesNo('Run npm ci automatically when dependencies are missing or stale?', previous.installDependencies ?? true),
  };
  saveState(state);
  return state;
}

function commandCheck(command, args, label) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  if (result.error || result.status !== 0) {
    fail(`${label} is not installed or did not run successfully.`);
    return false;
  }
  ok(`${label}: ${(result.stdout || result.stderr).trim().split(/\r?\n/)[0]}`);
  return true;
}

function dependenciesCurrent() {
  const marker = path.join(ROOT, 'node_modules', '.package-lock.json');
  if (!fs.existsSync(marker)) return false;
  return fs.statSync(marker).mtimeMs >= fs.statSync(path.join(ROOT, 'package-lock.json')).mtimeMs;
}

function tcpOpen(url) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const socket = net.createConnection({ host: target.hostname, port: Number(target.port || (target.protocol === 'https:' ? 443 : 80)), timeout: 1200 });
    const finish = (value) => { socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

async function check(state) {
  console.log('\nCassetteUI prerequisite check');
  let passed = commandCheck('node', ['--version'], 'Node.js');
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 20 || (major === 20 && minor < 9)) {
    fail(`Node.js 20.9 or newer is required (found ${process.version}).`);
    passed = false;
  }
  passed = commandCheck('npm', ['--version'], 'npm') && passed;

  if (dependenciesCurrent()) ok('node_modules matches package-lock.json.');
  else warn('Dependencies are missing or older than package-lock.json; the run command can execute npm ci.');

  const env = parseEnv();
  const required = [
    'NEXT_PUBLIC_API_URL_LOCAL', 'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'NEXT_PUBLIC_APP_DOMAIN',
  ];
  const missing = required.filter((key) => !useful(env[key]));
  if (missing.length) {
    fail(`.env.local is missing usable values: ${missing.join(', ')}`);
    passed = false;
  } else {
    ok('.env.local contains the required runtime values.');
  }
  const direct = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'APPLE_MUSIC_KEY_ID', 'APPLE_MUSIC_TEAM_ID', 'APPLE_MUSIC_PRIVATE_KEY'];
  const missingDirect = direct.filter((key) => !useful(env[key]));
  if (missingDirect.length) warn(`UI-owned charts/search routes remain unavailable until configured: ${missingDirect.join(', ')}`);

  try {
    const addresses = await dns.lookup('local.cassette.tech', { all: true });
    if (addresses.some(({ address }) => address === '::1' || address.startsWith('127.'))) ok('local.cassette.tech resolves to loopback.');
    else { fail('local.cassette.tech does not resolve to a loopback address.'); passed = false; }
  } catch {
    fail('local.cassette.tech did not resolve.');
    passed = false;
  }

  if (state?.bridgeUrl) {
    if (await tcpOpen(state.bridgeUrl)) ok(`Selected Bridge is reachable at ${state.bridgeUrl}.`);
    else warn(`Selected Bridge is not reachable at ${state.bridgeUrl}; start it before using API-backed flows.`);
  }
  return passed;
}

async function ensureDependencies(state) {
  if (dependenciesCurrent()) return true;
  if (!state.installDependencies) {
    fail('Dependencies are not current and automatic npm ci is disabled.');
    return false;
  }
  info('Installing exact dependencies with npm ci.');
  const npm = npmInvocation(['ci']);
  const result = spawnSync(npm.command, npm.args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: npm.shell,
  });
  return result.status === 0;
}

function npmInvocation(args) {
  if (process.env.npm_execpath) {
    return {
      command: process.execPath,
      args: [process.env.npm_execpath, ...args],
      shell: false,
    };
  }
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args,
    shell: process.platform === 'win32',
  };
}

async function runUi(state) {
  if (!(await check(state)) || !(await ensureDependencies(state))) return 1;
  rl?.close();
  console.log('\nRun summary');
  console.log(`  UI:       ${LOCAL_UI_ORIGIN}`);
  console.log(`  Bridge:   ${state.bridgeMode} (${state.bridgeUrl})`);
  console.log(`  Supabase: ${state.supabaseMode}`);
  console.log('\nStarting Next.js. Open the exact UI origin above; press Ctrl+C to stop.\n');
  const npm = npmInvocation(['run', 'dev', '--', '--hostname', '0.0.0.0', '--port', '3000']);
  const child = spawn(npm.command, npm.args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: npm.shell,
  });
  return await new Promise((resolve) => {
    child.once('error', (error) => {
      fail(`Unable to start Next.js: ${error.message}`);
      resolve(1);
    });
    child.once('exit', (code, signal) => resolve(signal ? 130 : (code ?? 1)));
  });
}

function resetState() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
    ok('Removed saved run choices. .env.local was preserved.');
  } else info('No saved run choices exist.');
  return 0;
}

function usage() {
  console.log('Usage: npm run local -- [run|rerun|configure|check|reset|help]');
  console.log('  run        choose a configuration and start the UI');
  console.log('  rerun      reuse the last configuration and start the UI');
  console.log('  configure  update .env.local and save choices without starting');
  console.log('  check      validate prerequisites and the saved configuration');
  console.log('  reset      forget saved choices but preserve .env.local');
}

async function interactiveAction() {
  return choose('What would you like to do?', [
    ['run', 'Configure and run'],
    ['rerun', 'Re-run the last configuration'],
    ['check', 'Check prerequisites and saved configuration'],
    ['configure', 'Configure only'],
    ['reset', 'Reset saved run choices'],
  ], loadState() ? 'rerun' : 'run');
}

async function main() {
  const action = (process.argv[2] ?? await interactiveAction()).toLowerCase();
  if (['help', '-h', '--help'].includes(action)) { usage(); return 0; }
  if (action === 'reset') return resetState();
  if (action === 'configure') { await configure(); return 0; }
  if (action === 'run') return runUi(await configure());
  let state = loadState();
  if (!state) {
    warn('No saved configuration exists; starting guided configuration.');
    state = await configure();
  }
  if (action === 'check') return (await check(state)) ? 0 : 1;
  if (action === 'rerun') return runUi(state);
  usage();
  return 2;
}

try {
  process.exitCode = await main();
} finally {
  rl?.close();
}
