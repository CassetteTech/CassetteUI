#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const separator = trimmed.indexOf('=');
  if (separator < 1) return null;

  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (process.env[parsed.key] == null || process.env[parsed.key] === '') {
      process.env[parsed.key] = parsed.value;
    }
  }
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env.production'));
loadEnvFile(path.join(projectRoot, '.env'));

const dryRun = process.argv.includes('--dry-run');
const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
).replace(/\/$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const posthogHost = (
  process.env.POSTHOG_HOST ||
  process.env.NEXT_PUBLIC_POSTHOG_HOST ||
  'https://app.posthog.com'
).replace(/\/$/, '');
const posthogApiKey = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const pageSize = Number(process.env.ACCOUNT_CREATED_BACKFILL_PAGE_SIZE || 500);

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

if (!supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

if (!dryRun && !posthogApiKey) {
  console.error('Missing POSTHOG_API_KEY or NEXT_PUBLIC_POSTHOG_KEY.');
  process.exit(1);
}

function normalizeAccountType(value) {
  if (value == null) return 'Regular';
  if (typeof value === 'number') {
    if (value === 2) return 'CassetteTeam';
    if (value === 1) return 'Verified';
    return 'Regular';
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === '2' || normalized === 'cassetteteam' || normalized === 'cassette_team' || normalized === 'cassette team') {
    return 'CassetteTeam';
  }

  if (normalized === '1' || normalized === 'verified') {
    return 'Verified';
  }

  return 'Regular';
}

function isInternalAccount(user) {
  return normalizeAccountType(user.AccountType ?? user.accountType ?? user.account_type) === 'CassetteTeam';
}

function userIdOf(user) {
  return String(user.UserId ?? user.userId ?? user.user_id ?? '').trim();
}

function joinDateOf(user) {
  return String(user.JoinDate ?? user.joinDate ?? user.join_date ?? '').trim();
}

function attributionProps(user) {
  return {
    signup_source: user.SignupSource ?? user.signupSource ?? user.signup_source ?? null,
    signup_medium: user.SignupMedium ?? user.signupMedium ?? user.signup_medium ?? null,
    signup_campaign: user.SignupCampaign ?? user.signupCampaign ?? user.signup_campaign ?? null,
    first_referrer_domain: user.FirstReferrerDomain ?? user.firstReferrerDomain ?? user.first_referrer_domain ?? null,
    first_touch_source: user.SignupSource ?? user.signupSource ?? user.signup_source ?? null,
  };
}

async function fetchUsersPage(offset) {
  const query = new URLSearchParams({
    select: [
      'UserId',
      'JoinDate',
      'AccountType',
      'GoogleId',
      'SignupSource',
      'SignupMedium',
      'SignupCampaign',
      'FirstReferrerDomain',
    ].join(','),
    order: 'JoinDate.asc',
    limit: String(pageSize),
    offset: String(offset),
  });

  const response = await fetch(`${supabaseUrl}/rest/v1/Users?${query}`, {
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase users page failed (${response.status}): ${text}`);
  }

  return await response.json();
}

async function fetchAllUsers() {
  const users = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchUsersPage(offset);
    users.push(...page);
    if (page.length < pageSize) return users;
  }
}

function toPosthogEvent(user) {
  const userId = userIdOf(user);
  const joinDate = joinDateOf(user);
  const authProvider = user.GoogleId || user.googleId || user.google_id ? 'google' : 'email';

  return {
    event: 'account_created',
    distinct_id: userId,
    timestamp: joinDate,
    properties: {
      ...attributionProps(user),
      $insert_id: `account_created:${userId}`,
      $lib: 'cassette-backfill',
      user_id: userId,
      route: '/api/v1/auth',
      source_surface: 'auth',
      is_authenticated: true,
      account_type: normalizeAccountType(user.AccountType ?? user.accountType ?? user.account_type),
      internal_actor: false,
      auth_provider: authProvider,
      user_join_date: joinDate,
    },
  };
}

async function posthogBatch(events) {
  if (dryRun || events.length === 0) return;

  const response = await fetch(`${posthogHost}/batch/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: posthogApiKey,
      batch: events,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`PostHog batch failed (${response.status}): ${text}`);
  }
}

async function main() {
  console.log(`Backfilling account_created events (${dryRun ? 'dry-run' : 'apply'})`);
  console.log(`Supabase: ${new URL(supabaseUrl).host}`);
  console.log(`PostHog: ${posthogHost}`);

  const users = await fetchAllUsers();
  const externalUsers = users.filter((user) => userIdOf(user) && joinDateOf(user) && !isInternalAccount(user));
  const events = externalUsers.map(toPosthogEvent);

  if (events.length > 0) {
    console.log(`Date range: ${events[0].timestamp} -> ${events[events.length - 1].timestamp}`);
  }

  console.log(`Users fetched: ${users.length}`);
  console.log(`External account_created events: ${events.length}`);

  for (let index = 0; index < events.length; index += 500) {
    await posthogBatch(events.slice(index, index + 500));
  }

  console.log('Backfill complete.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
