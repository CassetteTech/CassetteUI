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
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (process.env[parsed.key] == null || process.env[parsed.key] === '') {
      process.env[parsed.key] = parsed.value;
    }
  }
}

const projectRoot = process.cwd();
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const dryRun = process.argv.includes('--dry-run');
const pmfOnly = process.argv.includes('--pmf-only');

const host = (
  process.env.POSTHOG_APP_HOST ||
  process.env.POSTHOG_HOST ||
  'https://app.posthog.com'
).replace(/\/$/, '');
const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY || '';
const environmentId = process.env.POSTHOG_ENVIRONMENT_ID || '';
const projectId = process.env.POSTHOG_PROJECT_ID || '';

if (!environmentId && !projectId) {
  console.error('Missing POSTHOG_ENVIRONMENT_ID (preferred) or POSTHOG_PROJECT_ID.');
  process.exit(1);
}

if (!dryRun && !personalApiKey) {
  console.error('Missing POSTHOG_PERSONAL_API_KEY.');
  process.exit(1);
}

const scopePath = environmentId
  ? `/api/environments/${environmentId}`
  : `/api/projects/${projectId}`;
const projectScopePath = projectId ? `/api/projects/${projectId}` : null;

function internalActorPropertyFilter(internalActor) {
  return {
    key: 'internal_actor',
    value: internalActor ? 'true' : 'false',
    operator: 'exact',
    type: 'event',
  };
}

function withInternalActorFilter(definitions, internalActor) {
  return definitions.map((definition) => {
    if (!definition.filters?.events) {
      return definition;
    }

    const events = Array.isArray(definition.filters?.events)
      ? definition.filters.events.map((eventFilter) => {
        const existing = Array.isArray(eventFilter.properties) ? eventFilter.properties : [];
        const hasFilter = existing.some((property) => property?.key === 'internal_actor');

        return {
          ...eventFilter,
          properties: hasFilter ? existing : [...existing, internalActorPropertyFilter(internalActor)],
        };
      })
      : [];

    return {
      ...definition,
      filters: {
        ...definition.filters,
        events,
      },
    };
  });
}

const elementTypes = ['track', 'album', 'artist', 'playlist'];
const targetPlatforms = ['spotify', 'apple', 'deezer'];
const FUNNEL_WINDOW_7_DAYS = {
  funnel_window_interval: 7,
  funnel_window_interval_unit: 'day',
};
const FUNNEL_WINDOW_14_DAYS = {
  funnel_window_interval: 14,
  funnel_window_interval_unit: 'day',
};

function linkConvertedEventForElementType(elementType, name = `link_converted (${elementType})`) {
  return {
    id: 'link_converted',
    name,
    type: 'events',
    properties: [
      { key: 'core_action', value: 'true', operator: 'exact', type: 'event' },
      { key: 'element_type', value: elementType, operator: 'exact', type: 'event' },
    ],
  };
}

function linkConvertedElementTypeSplitEvents() {
  return elementTypes.map((elementType) => linkConvertedEventForElementType(elementType));
}

function postPlatformConversionEvent({ name, targetPlatform, elementType, math } = {}) {
  const properties = [
    { key: 'source_surface', value: 'post', operator: 'exact', type: 'event' },
  ];

  if (targetPlatform) {
    properties.push({ key: 'target_platform', value: targetPlatform, operator: 'exact', type: 'event' });
  }

  if (elementType) {
    properties.push({ key: 'element_type', value: elementType, operator: 'exact', type: 'event' });
  }

  return {
    id: 'post_platform_conversion_clicked',
    name: name || 'post_platform_conversion_clicked',
    type: 'events',
    ...(math ? { math } : {}),
    properties,
  };
}

function postDistributionMetricQuery(internalActor) {
  const internalActorLiteral = internalActor ? 'true' : 'false';

  return [
    'with matured_posts as (',
    '  select',
    '    properties.post_id as post_id,',
    '    min(timestamp) as created_at',
    "  from events",
    "  where event = 'post_created'",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '    and coalesce(toBool(properties.is_repost), false) = false',
    '    and properties.post_id is not null',
    '    and timestamp >= now() - INTERVAL 37 DAY',
    '    and timestamp < now() - INTERVAL 7 DAY',
    '  group by post_id',
    '), post_views as (',
    '  select',
    '    properties.post_id as post_id,',
    '    distinct_id,',
    '    timestamp,',
    "    coalesce(toString(properties.is_creator_view), 'false') as is_creator_view,",
    '    coalesce(toBool(properties.internal_actor), false) as internal_actor',
    '  from events',
    "  where event = 'post_viewed'",
    '), qualified_posts as (',
    '  select',
    '    p.post_id as post_id,',
    '    uniqExactIf(',
    '      v.distinct_id,',
    '      v.timestamp >= p.created_at and v.timestamp < p.created_at + INTERVAL 7 DAY',
    '    ) as distinct_non_creator_viewers',
    '  from matured_posts p',
    '  left join post_views v',
    '    on v.post_id = p.post_id',
    "   and v.is_creator_view = 'false'",
    `   and v.internal_actor = ${internalActorLiteral}`,
    '  group by p.post_id',
    ')',
    'select',
    '  toDate(now() - INTERVAL 37 DAY) as created_from,',
    '  toDate(now() - INTERVAL 7 DAY) as created_to,',
    '  count() as total_posts,',
    '  countIf(distinct_non_creator_viewers >= 3) as posts_with_3plus_non_creator_viewers_7d,',
    '  if(',
    '    count() = 0,',
    '    0,',
    '    round(100.0 * countIf(distinct_non_creator_viewers >= 3) / count(), 2)',
    '  ) as pct_posts_with_3plus_non_creator_viewers_7d',
    'from qualified_posts',
  ].join('\n');
}

function postDistributionMetricInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}post_distribution_3plus_viewers_7d`,
    name: `${prefix}Post Distribution Success (3+ Viewers, 7d)`,
    description: `${prefix || ''}For posts created 37 to 7 days ago, the share that reached at least 3 distinct non-creator viewers within 7 days.`,
    query: {
      kind: 'DataTableNode',
      source: {
        kind: 'HogQLQuery',
        query: postDistributionMetricQuery(internalActor),
      },
    },
  };
}

function postDistributionLadderQuery(internalActor) {
  const internalActorLiteral = internalActor ? 'true' : 'false';

  return [
    'with matured_posts as (',
    '  select',
    '    properties.post_id as post_id,',
    '    min(timestamp) as created_at',
    '  from events',
    "  where event = 'post_created'",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '    and coalesce(toBool(properties.is_repost), false) = false',
    '    and properties.post_id is not null',
    '    and timestamp >= now() - INTERVAL 37 DAY',
    '    and timestamp < now() - INTERVAL 7 DAY',
    '  group by post_id',
    '), post_views as (',
    '  select',
    '    properties.post_id as post_id,',
    '    distinct_id,',
    '    timestamp,',
    "    coalesce(toString(properties.is_creator_view), 'false') as is_creator_view,",
    '    coalesce(toBool(properties.internal_actor), false) as internal_actor',
    '  from events',
    "  where event = 'post_viewed'",
    '), qualified_posts as (',
    '  select',
    '    p.post_id as post_id,',
    '    uniqExactIf(',
    '      v.distinct_id,',
    '      v.timestamp >= p.created_at and v.timestamp < p.created_at + INTERVAL 7 DAY',
    '    ) as distinct_non_creator_viewers',
    '  from matured_posts p',
    '  left join post_views v',
    '    on v.post_id = p.post_id',
    "   and v.is_creator_view = 'false'",
    `   and v.internal_actor = ${internalActorLiteral}`,
    '  group by p.post_id',
    ')',
    'select',
    '  count() as total_posts,',
    '  countIf(distinct_non_creator_viewers >= 1) as posts_with_1plus_viewer_7d,',
    '  countIf(distinct_non_creator_viewers >= 3) as posts_with_3plus_viewers_7d,',
    '  countIf(distinct_non_creator_viewers >= 5) as posts_with_5plus_viewers_7d,',
    '  countIf(distinct_non_creator_viewers >= 10) as posts_with_10plus_viewers_7d,',
    '  if(count() = 0, 0, round(100.0 * countIf(distinct_non_creator_viewers >= 1) / count(), 2)) as pct_with_1plus_7d,',
    '  if(count() = 0, 0, round(100.0 * countIf(distinct_non_creator_viewers >= 3) / count(), 2)) as pct_with_3plus_7d,',
    '  if(count() = 0, 0, round(100.0 * countIf(distinct_non_creator_viewers >= 5) / count(), 2)) as pct_with_5plus_7d,',
    '  if(count() = 0, 0, round(100.0 * countIf(distinct_non_creator_viewers >= 10) / count(), 2)) as pct_with_10plus_7d,',
    '  round(quantileExact(0.5)(distinct_non_creator_viewers), 2) as median_non_creator_viewers_7d',
    'from qualified_posts',
  ].join('\n');
}

function postDistributionLadderInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}post_distribution_ladder`,
    name: `${prefix}Post Distribution Ladder`,
    description: `${prefix || ''}Distribution ladder for original posts after 7 days, from first viewer to 10+ non-creator viewers.`,
    query: {
      kind: 'DataTableNode',
      source: {
        kind: 'HogQLQuery',
        query: postDistributionLadderQuery(internalActor),
      },
    },
  };
}

function creatorRepeatAfterDistributionQuery(internalActor) {
  const internalActorLiteral = internalActor ? 'true' : 'false';

  return [
    'with candidate_posts as (',
    '  select',
    '    properties.post_id as post_id,',
    '    coalesce(person_id, distinct_id) as creator_actor_id,',
    '    min(timestamp) as created_at',
    '  from events',
    "  where event = 'post_created'",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '    and coalesce(toBool(properties.is_repost), false) = false',
    '    and properties.post_id is not null',
    '    and timestamp >= now() - INTERVAL 67 DAY',
    '    and timestamp < now() - INTERVAL 30 DAY',
    '  group by post_id, creator_actor_id',
    '), post_views as (',
    '  select',
    '    properties.post_id as post_id,',
    '    distinct_id,',
    '    timestamp,',
    "    coalesce(toString(properties.is_creator_view), 'false') as is_creator_view,",
    '    coalesce(toBool(properties.internal_actor), false) as internal_actor',
    '  from events',
    "  where event = 'post_viewed'",
    '), distributed_posts as (',
    '  select',
    '    p.post_id,',
    '    p.creator_actor_id,',
    '    p.created_at,',
    '    uniqExactIf(',
    '      v.distinct_id,',
    '      v.timestamp >= p.created_at and v.timestamp < p.created_at + INTERVAL 7 DAY',
    '    ) as distinct_non_creator_viewers',
    '  from candidate_posts p',
    '  left join post_views v',
    '    on v.post_id = p.post_id',
    "   and v.is_creator_view = 'false'",
    `   and v.internal_actor = ${internalActorLiteral}`,
    '  group by p.post_id, p.creator_actor_id, p.created_at',
    '), creator_first_distributed as (',
    '  select',
    '    creator_actor_id,',
    '    min(created_at) as first_distributed_at',
    '  from distributed_posts',
    '  where distinct_non_creator_viewers >= 3',
    '  group by creator_actor_id',
    '), creator_next_post as (',
    '  select',
    '    d.creator_actor_id,',
    '    d.first_distributed_at,',
    '    min(p.timestamp) as next_post_at',
    '  from creator_first_distributed d',
    '  left join events p',
    "    on p.event = 'post_created'",
    '   and coalesce(p.person_id, p.distinct_id) = d.creator_actor_id',
    `   and coalesce(toBool(p.properties.internal_actor), false) = ${internalActorLiteral}`,
    '   and coalesce(toBool(p.properties.is_repost), false) = false',
    '   and p.timestamp > d.first_distributed_at',
    '   and p.timestamp < d.first_distributed_at + INTERVAL 30 DAY',
    '  group by d.creator_actor_id, d.first_distributed_at',
    ')',
    'select',
    '  count() as creators_with_distributed_post,',
    '  countIf(next_post_at is not null) as creators_who_posted_again_30d,',
    '  if(count() = 0, 0, round(100.0 * countIf(next_post_at is not null) / count(), 2)) as pct_creators_posted_again_30d,',
    "  round(avgIf(dateDiff('day', first_distributed_at, next_post_at), next_post_at is not null), 2) as avg_days_to_next_post",
    'from creator_next_post',
  ].join('\n');
}

function creatorRepeatAfterDistributionInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}creator_repeat_after_distribution`,
    name: `${prefix}Creator Repeat After Distribution`,
    description: `${prefix || ''}For creators whose original post reached 3+ non-creator viewers in 7 days, the share who posted again within 30 days.`,
    query: {
      kind: 'DataTableNode',
      source: {
        kind: 'HogQLQuery',
        query: creatorRepeatAfterDistributionQuery(internalActor),
      },
    },
  };
}

function viewerToContributorQuery(internalActor) {
  const internalActorLiteral = internalActor ? 'true' : 'false';

  return [
    'with viewer_first_touch as (',
    '  select',
    '    coalesce(person_id, distinct_id) as viewer_actor_id,',
    '    min(timestamp) as first_view_at,',
    "    argMin(coalesce(toString(properties.is_authenticated), 'false'), timestamp) as first_view_authenticated",
    '  from events',
    "  where event = 'post_viewed'",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    "    and coalesce(toString(properties.is_creator_view), 'false') = 'false'",
    '    and timestamp >= now() - INTERVAL 44 DAY',
    '    and timestamp < now() - INTERVAL 14 DAY',
    '  group by viewer_actor_id',
    '), viewer_auth as (',
    '  select',
    '    v.viewer_actor_id,',
    '    min(a.timestamp) as auth_success_at',
    '  from viewer_first_touch v',
    '  left join events a',
    "    on a.event in ('auth_signed_up', 'auth_signed_in', 'auth_google_oauth_completed')",
    '   and coalesce(a.person_id, a.distinct_id) = v.viewer_actor_id',
    `   and coalesce(toBool(a.properties.internal_actor), false) = ${internalActorLiteral}`,
    '   and a.timestamp > v.first_view_at',
    '   and a.timestamp < v.first_view_at + INTERVAL 7 DAY',
    '  group by v.viewer_actor_id',
    '), viewer_post as (',
    '  select',
    '    v.viewer_actor_id,',
    '    min(p.timestamp) as first_post_at',
    '  from viewer_first_touch v',
    '  left join events p',
    "    on p.event = 'post_created'",
    '   and coalesce(p.person_id, p.distinct_id) = v.viewer_actor_id',
    `   and coalesce(toBool(p.properties.internal_actor), false) = ${internalActorLiteral}`,
    '   and coalesce(toBool(p.properties.is_repost), false) = false',
    '   and p.timestamp > v.first_view_at',
    '   and p.timestamp < v.first_view_at + INTERVAL 14 DAY',
    '  group by v.viewer_actor_id',
    '), viewer_outcomes as (',
    '  select',
    '    v.viewer_actor_id,',
    '    v.first_view_authenticated,',
    '    a.auth_success_at,',
    '    p.first_post_at',
    '  from viewer_first_touch v',
    '  left join viewer_auth a on a.viewer_actor_id = v.viewer_actor_id',
    '  left join viewer_post p on p.viewer_actor_id = v.viewer_actor_id',
    ')',
    'select',
    "  'all_viewers' as viewer_segment,",
    '  count() as viewers,',
    '  countIf(auth_success_at is not null) as auth_success_7d,',
    '  countIf(first_post_at is not null) as created_post_14d,',
    '  if(count() = 0, 0, round(100.0 * countIf(auth_success_at is not null) / count(), 2)) as pct_auth_success_7d,',
    '  if(count() = 0, 0, round(100.0 * countIf(first_post_at is not null) / count(), 2)) as pct_created_post_14d',
    'from viewer_outcomes',
    'union all',
    'select',
    "  'signed_out_viewers' as viewer_segment,",
    '  count() as viewers,',
    '  countIf(auth_success_at is not null) as auth_success_7d,',
    '  countIf(first_post_at is not null) as created_post_14d,',
    '  if(count() = 0, 0, round(100.0 * countIf(auth_success_at is not null) / count(), 2)) as pct_auth_success_7d,',
    '  if(count() = 0, 0, round(100.0 * countIf(first_post_at is not null) / count(), 2)) as pct_created_post_14d',
    'from viewer_outcomes',
    "where first_view_authenticated = 'false'",
    'union all',
    'select',
    "  'signed_in_viewers' as viewer_segment,",
    '  count() as viewers,',
    '  countIf(auth_success_at is not null) as auth_success_7d,',
    '  countIf(first_post_at is not null) as created_post_14d,',
    '  if(count() = 0, 0, round(100.0 * countIf(auth_success_at is not null) / count(), 2)) as pct_auth_success_7d,',
    '  if(count() = 0, 0, round(100.0 * countIf(first_post_at is not null) / count(), 2)) as pct_created_post_14d',
    'from viewer_outcomes',
    "where first_view_authenticated = 'true'",
  ].join('\n');
}

function viewerToContributorInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}viewer_to_contributor`,
    name: `${prefix}Viewer to Contributor Conversion`,
    description: `${prefix || ''}For non-creator viewers with a matured 14-day follow-up window, conversion from first post view into auth success and first original post.`,
    query: {
      kind: 'DataTableNode',
      source: {
        kind: 'HogQLQuery',
        query: viewerToContributorQuery(internalActor),
      },
    },
  };
}

function playlistCreationOutcomesQuery(internalActor) {
  const internalActorLiteral = internalActor ? 'true' : 'false';

  return [
    'select',
    "  coalesce(nullIf(toString(properties.target_platform), ''), 'unknown') as target_platform,",
    "  countIf(event = 'playlist_creation_submitted') as submitted,",
    "  countIf(event = 'playlist_creation_blocked') as blocked,",
    "  countIf(event = 'playlist_created_on_platform') as created,",
    "  countIf(event = 'playlist_creation_failed') as failed,",
    "  if(countIf(event = 'playlist_creation_submitted') = 0, 0, round(100.0 * countIf(event = 'playlist_created_on_platform') / countIf(event = 'playlist_creation_submitted'), 2)) as created_per_submit_pct,",
    "  if(countIf(event = 'playlist_created_on_platform') = 0, 0, round(avgIf(toFloat64OrNull(toString(properties.tracks_failed)), event = 'playlist_created_on_platform'), 2)) as avg_tracks_failed_per_success,",
    "  if(countIf(event = 'playlist_created_on_platform') = 0, 0, round(avgIf(toFloat64OrNull(toString(properties.total_tracks)), event = 'playlist_created_on_platform'), 2)) as avg_tracks_attempted_per_success",
    'from events',
    "where event in ('playlist_creation_submitted', 'playlist_creation_blocked', 'playlist_created_on_platform', 'playlist_creation_failed')",
    `  and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '  and timestamp >= now() - INTERVAL 30 DAY',
    'group by target_platform',
    'order by submitted desc, target_platform asc',
  ].join('\n');
}

function playlistCreationOutcomesInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}playlist_creation_outcomes`,
    name: `${prefix}Playlist Creation Outcomes`,
    description: `${prefix || ''}30-day playlist creation submit, blocked, failure, and success outcomes by target platform.`,
    query: {
      kind: 'DataTableNode',
      source: {
        kind: 'HogQLQuery',
        query: playlistCreationOutcomesQuery(internalActor),
      },
    },
  };
}

function playlistCreationFunnelInsight({ internalActor }) {
  return {
    key: internalActor ? 'internal_post_engagement_funnel' : 'post_engagement_funnel',
    name: internalActor ? 'Internal Post Engagement Funnel' : 'Post Engagement Funnel',
    description: internalActor
      ? 'Internal playlist creation flow: post_viewed -> playlist convert CTA click -> playlist_created_on_platform.'
      : 'Playlist creation flow: post_viewed -> playlist convert CTA click -> playlist_created_on_platform.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        ...FUNNEL_WINDOW_14_DAYS,
        series: [
          {
            kind: 'EventsNode',
            event: 'post_viewed',
            name: 'post_viewed',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_platform_conversion_clicked',
            name: 'post_platform_conversion_clicked',
            properties: [
              internalActorPropertyFilter(internalActor),
              {
                key: 'source_context',
                value: 'playlist_convert_button',
                operator: 'exact',
                type: 'event',
              },
            ],
          },
          {
            kind: 'EventsNode',
            event: 'playlist_created_on_platform',
            name: 'playlist_created_on_platform',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
        ],
        funnelsFilter: {
          layout: 'horizontal',
          funnelVizType: 'steps',
        },
        properties: [],
        filterTestAccounts: false,
      },
    },
  };
}

function creatorIntentActivationFunnelInsight({ internalActor }) {
  return {
    key: internalActor ? 'internal_creator_intent_activation' : 'creator_intent_activation',
    name: internalActor ? 'Internal Creator Intent Activation Funnel' : 'Creator Intent Activation Funnel',
    description: internalActor
      ? 'Internal explicit creator intent: conversion_entry_started -> auth_signed_up -> onboarding_completed -> music_service_connected -> post_created.'
      : 'Explicit creator intent: conversion_entry_started -> auth_signed_up -> onboarding_completed -> music_service_connected -> post_created.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: 'conversion_entry_started',
            name: 'conversion_entry_started',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'auth_signed_up',
            name: 'auth_signed_up',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'onboarding_completed',
            name: 'onboarding_completed',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'music_service_connected',
            name: 'music_service_connected',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_created',
            name: 'post_created',
            properties: [
              internalActorPropertyFilter(internalActor),
              {
                key: 'is_repost',
                value: 'false',
                operator: 'exact',
                type: 'event',
              },
            ],
          },
        ],
        funnelsFilter: {
          layout: 'horizontal',
          funnelVizType: 'steps',
        },
        properties: [],
        filterTestAccounts: false,
      },
    },
  };
}

const insightDefinitions = [
  {
    key: 'waa_core_actions',
    name: 'Weekly Active Accounts (Core Actions)',
    description: 'Distinct active users with core_action=true over time.',
    filters: {
      insight: 'TRENDS',
      interval: 'week',
      display: 'ActionsLineGraph',
      events: [
        {
          id: 'link_converted',
          name: 'link_converted',
          type: 'events',
          math: 'dau',
          properties: [
            { key: 'core_action', value: 'true', operator: 'exact', type: 'event' },
          ],
        },
      ],
    },
  },
  {
    key: 'dau_mau_core_actions',
    name: 'DAU/MAU Users (Core Actions)',
    description: 'DAU and MAU trend for users performing core actions.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [
        {
          id: 'link_converted',
          name: 'link_converted',
          type: 'events',
          math: 'dau',
          properties: [
            { key: 'core_action', value: 'true', operator: 'exact', type: 'event' },
          ],
        },
      ],
      compare: true,
    },
  },
  {
    key: 'core_actions_track',
    name: 'Core Actions - Track',
    description: 'Successful core link conversions for tracks.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('track')],
    },
  },
  {
    key: 'core_actions_album',
    name: 'Core Actions - Album',
    description: 'Successful core link conversions for albums.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('album')],
    },
  },
  {
    key: 'core_actions_artist',
    name: 'Core Actions - Artist',
    description: 'Successful core link conversions for artists.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('artist')],
    },
  },
  {
    key: 'core_actions_playlist',
    name: 'Core Actions - Playlist',
    description: 'Successful core link conversions for playlists.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('playlist')],
    },
  },
  {
    key: 'core_actions_element_type_share',
    name: 'Core Actions - Element Type Share (%)',
    description: 'Share of successful core link conversions by element type.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsPie',
      events: [
        {
          id: 'link_converted',
          name: 'link_converted',
          type: 'events',
          properties: [
            { key: 'core_action', value: 'true', operator: 'exact', type: 'event' },
          ],
        },
      ],
      breakdown: 'element_type',
      breakdown_type: 'event',
    },
  },
  {
    key: 'link_conversion_funnel',
    name: 'Link Conversion Funnel',
    description: 'Link flow: link_conversion_submitted -> link_converted -> post_created.',
    filters: {
      insight: 'FUNNELS',
      layout: 'horizontal',
      events: [
        { id: 'link_conversion_submitted', type: 'events', order: 0, name: 'link_conversion_submitted' },
        { id: 'link_converted', type: 'events', order: 1, name: 'link_converted' },
        { id: 'post_created', type: 'events', order: 2, name: 'post_created' },
      ],
    },
  },
  {
    key: 'conversion_funnel',
    name: 'Conversion Funnel',
    description: 'Creator flow: post_viewed -> auth_signed_up -> post_created.',
    filters: {
      insight: 'FUNNELS',
      layout: 'horizontal',
      ...FUNNEL_WINDOW_7_DAYS,
      events: [
        { id: 'post_viewed', type: 'events', order: 0, name: 'post_viewed' },
        { id: 'auth_signed_up', type: 'events', order: 1, name: 'auth_signed_up' },
        { id: 'post_created', type: 'events', order: 2, name: 'post_created' },
      ],
    },
  },
  {
    key: 'post_engagement_funnel',
    name: 'Post Engagement Funnel',
    description: 'Playlist creation flow: post_viewed -> playlist convert CTA click -> playlist_created_on_platform.',
    query: playlistCreationFunnelInsight({ internalActor: false }).query,
  },
  {
    key: 'post_platform_cta_clicks_total',
    name: 'Post Platform CTA Clicks (Total)',
    description: 'Total post-page destination CTA clicks (convert/open by platform).',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [postPlatformConversionEvent()],
    },
  },
  {
    key: 'post_platform_cta_users_unique',
    name: 'Post Platform CTA Users (Unique)',
    description: 'Unique users clicking post-page destination CTAs.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [postPlatformConversionEvent({ math: 'dau' })],
    },
  },
  {
    key: 'post_platform_cta_by_target_platform',
    name: 'Post Platform CTA by Target Platform',
    description: 'Post-page destination CTA clicks split by target platform.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsBar',
      events: targetPlatforms.map((platform) => postPlatformConversionEvent({
        name: `post_platform_conversion_clicked (${platform})`,
        targetPlatform: platform,
      })),
    },
  },
  {
    key: 'post_platform_cta_by_element_type',
    name: 'Post Platform CTA by Element Type',
    description: 'Post-page destination CTA clicks split by element type.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsBar',
      events: [postPlatformConversionEvent()],
      breakdown: 'element_type',
      breakdown_type: 'event',
    },
  },
  {
    key: 'platform_source_mix',
    name: 'Platform Source Mix',
    description: 'Distribution of pasted links by source platform.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsPie',
      events: [
        {
          id: 'music_link_pasted',
          name: 'music_link_pasted',
          type: 'events',
        },
      ],
      breakdown: 'source_platform',
      breakdown_type: 'event',
    },
  },
  {
    key: 'failure_monitor',
    name: 'Failure Monitor',
    description: 'All failed events grouped by event + route + platform.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsTable',
      events: [
        { id: 'link_conversion_failed', name: 'link_conversion_failed', type: 'events' },
        { id: 'post_create_failed', name: 'post_create_failed', type: 'events' },
        { id: 'post_update_failed', name: 'post_update_failed', type: 'events' },
        { id: 'post_delete_failed', name: 'post_delete_failed', type: 'events' },
        { id: 'profile_update_failed', name: 'profile_update_failed', type: 'events' },
        { id: 'music_service_connection_failed', name: 'music_service_connection_failed', type: 'events' },
        { id: 'playlist_creation_failed', name: 'playlist_creation_failed', type: 'events' },
        { id: 'issue_report_failed', name: 'issue_report_failed', type: 'events' },
      ],
      breakdown: '$event',
      breakdown_type: 'event',
    },
  },
  {
    key: 'onboarding_activation',
    name: 'Onboarding Activation Funnel',
    description: 'auth_signed_up -> onboarding_completed -> first link_converted.',
    filters: {
      insight: 'FUNNELS',
      layout: 'horizontal',
      events: [
        { id: 'auth_signed_up', type: 'events', order: 0, name: 'auth_signed_up' },
        { id: 'onboarding_completed', type: 'events', order: 1, name: 'onboarding_completed' },
        { id: 'link_converted', type: 'events', order: 2, name: 'link_converted' },
      ],
    },
  },
  {
    key: 'creator_intent_activation',
    name: 'Creator Intent Activation Funnel',
    description: 'Explicit creator intent: conversion_entry_started -> auth_signed_up -> onboarding_completed -> music_service_connected -> post_created.',
    filters: {
      insight: 'FUNNELS',
      layout: 'horizontal',
      ...FUNNEL_WINDOW_14_DAYS,
      events: [
        { id: 'conversion_entry_started', type: 'events', order: 0, name: 'conversion_entry_started' },
        { id: 'auth_signed_up', type: 'events', order: 1, name: 'auth_signed_up' },
        { id: 'onboarding_completed', type: 'events', order: 2, name: 'onboarding_completed' },
        { id: 'music_service_connected', type: 'events', order: 3, name: 'music_service_connected' },
        { id: 'post_created', type: 'events', order: 4, name: 'post_created' },
      ],
    },
  },
];

const dashboardName = 'Cassette Product Analytics';
const internalDashboardName = 'Cassette Internal Activity';
const deprecatedInsightNames = [
  'Core Actions by Element Type',
  'Internal Core Actions by Element Type',
];

const productInsightDefinitions = withInternalActorFilter(insightDefinitions, false);
productInsightDefinitions.push(postDistributionMetricInsight({ internalActor: false }));
productInsightDefinitions.push(postDistributionLadderInsight({ internalActor: false }));
productInsightDefinitions.push(creatorRepeatAfterDistributionInsight({ internalActor: false }));
productInsightDefinitions.push(viewerToContributorInsight({ internalActor: false }));
productInsightDefinitions.push(playlistCreationOutcomesInsight({ internalActor: false }));

const internalInsightDefinitions = withInternalActorFilter([
  {
    key: 'internal_activity_trend',
    name: 'Internal Activity Trend',
    description: 'Internal CassetteTeam actions across key product events.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [
        { id: 'link_converted', name: 'link_converted', type: 'events' },
        { id: 'post_created', name: 'post_created', type: 'events' },
        { id: 'profile_updated', name: 'profile_updated', type: 'events' },
        { id: 'playlist_created_on_platform', name: 'playlist_created_on_platform', type: 'events' },
        { id: 'music_service_connected', name: 'music_service_connected', type: 'events' },
      ],
    },
  },
  {
    key: 'internal_core_actions_track',
    name: 'Internal Core Actions - Track',
    description: 'Internal successful core link conversions for tracks.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('track')],
    },
  },
  {
    key: 'internal_core_actions_album',
    name: 'Internal Core Actions - Album',
    description: 'Internal successful core link conversions for albums.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('album')],
    },
  },
  {
    key: 'internal_core_actions_artist',
    name: 'Internal Core Actions - Artist',
    description: 'Internal successful core link conversions for artists.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('artist')],
    },
  },
  {
    key: 'internal_core_actions_playlist',
    name: 'Internal Core Actions - Playlist',
    description: 'Internal successful core link conversions for playlists.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [linkConvertedEventForElementType('playlist')],
    },
  },
  {
    key: 'internal_core_actions_element_type_share',
    name: 'Internal Core Actions - Element Type Share (%)',
    description: 'Internal share of successful core link conversions by element type.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsPie',
      events: [
        {
          id: 'link_converted',
          name: 'link_converted',
          type: 'events',
          properties: [
            { key: 'core_action', value: 'true', operator: 'exact', type: 'event' },
          ],
        },
      ],
      breakdown: 'element_type',
      breakdown_type: 'event',
    },
  },
  {
    key: 'internal_post_platform_cta_clicks_total',
    name: 'Internal Post Platform CTA Clicks (Total)',
    description: 'Total internal post-page destination CTA clicks.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [postPlatformConversionEvent()],
    },
  },
  {
    key: 'internal_post_platform_cta_users_unique',
    name: 'Internal Post Platform CTA Users (Unique)',
    description: 'Unique internal users clicking post-page destination CTAs.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsLineGraph',
      events: [postPlatformConversionEvent({ math: 'dau' })],
    },
  },
  {
    key: 'internal_post_platform_cta_by_target_platform',
    name: 'Internal Post Platform CTA by Target Platform',
    description: 'Internal post-page destination CTA clicks split by target platform.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsBar',
      events: targetPlatforms.map((platform) => postPlatformConversionEvent({
        name: `post_platform_conversion_clicked (${platform})`,
        targetPlatform: platform,
      })),
    },
  },
  {
    key: 'internal_post_platform_cta_by_element_type',
    name: 'Internal Post Platform CTA by Element Type',
    description: 'Internal post-page destination CTA clicks split by element type.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsBar',
      events: [postPlatformConversionEvent()],
      breakdown: 'element_type',
      breakdown_type: 'event',
    },
  },
  {
    key: 'internal_link_conversion_funnel',
    name: 'Internal Link Conversion Funnel',
    description: 'Internal link flow: link_conversion_submitted -> link_converted -> post_created.',
    filters: {
      insight: 'FUNNELS',
      layout: 'horizontal',
      events: [
        { id: 'link_conversion_submitted', type: 'events', order: 0, name: 'link_conversion_submitted' },
        { id: 'link_converted', type: 'events', order: 1, name: 'link_converted' },
        { id: 'post_created', type: 'events', order: 2, name: 'post_created' },
      ],
    },
  },
  {
    key: 'internal_conversion_funnel',
    name: 'Internal Conversion Funnel',
    description: 'Internal creator flow: post_viewed -> auth_signed_up -> post_created.',
    filters: {
      insight: 'FUNNELS',
      layout: 'horizontal',
      ...FUNNEL_WINDOW_7_DAYS,
      events: [
        { id: 'post_viewed', type: 'events', order: 0, name: 'post_viewed' },
        { id: 'auth_signed_up', type: 'events', order: 1, name: 'auth_signed_up' },
        { id: 'post_created', type: 'events', order: 2, name: 'post_created' },
      ],
    },
  },
  {
    key: 'internal_failure_monitor',
    name: 'Internal Failure Monitor',
    description: 'Internal failed events grouped by event.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsTable',
      events: [
        { id: 'link_conversion_failed', name: 'link_conversion_failed', type: 'events' },
        { id: 'post_create_failed', name: 'post_create_failed', type: 'events' },
        { id: 'post_update_failed', name: 'post_update_failed', type: 'events' },
        { id: 'post_delete_failed', name: 'post_delete_failed', type: 'events' },
        { id: 'profile_update_failed', name: 'profile_update_failed', type: 'events' },
        { id: 'music_service_connection_failed', name: 'music_service_connection_failed', type: 'events' },
        { id: 'playlist_creation_failed', name: 'playlist_creation_failed', type: 'events' },
        { id: 'issue_report_failed', name: 'issue_report_failed', type: 'events' },
      ],
      breakdown: '$event',
      breakdown_type: 'event',
    },
  },
  {
    key: 'internal_platform_source_mix',
    name: 'Internal Platform Source Mix',
    description: 'Distribution of internal pasted links by source platform.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsPie',
      events: [
        { id: 'music_link_pasted', name: 'music_link_pasted', type: 'events' },
      ],
      breakdown: 'source_platform',
      breakdown_type: 'event',
    },
  },
], true);
internalInsightDefinitions.push(postDistributionMetricInsight({ internalActor: true }));
internalInsightDefinitions.push(postDistributionLadderInsight({ internalActor: true }));
internalInsightDefinitions.push(creatorRepeatAfterDistributionInsight({ internalActor: true }));
internalInsightDefinitions.push(viewerToContributorInsight({ internalActor: true }));
internalInsightDefinitions.push(playlistCreationOutcomesInsight({ internalActor: true }));

const pmfProductInsightDefinitions = [
  creatorIntentActivationFunnelInsight({ internalActor: false }),
  postDistributionMetricInsight({ internalActor: false }),
  postDistributionLadderInsight({ internalActor: false }),
  creatorRepeatAfterDistributionInsight({ internalActor: false }),
  viewerToContributorInsight({ internalActor: false }),
  playlistCreationOutcomesInsight({ internalActor: false }),
];

const pmfInternalInsightDefinitions = [
  creatorIntentActivationFunnelInsight({ internalActor: true }),
  postDistributionMetricInsight({ internalActor: true }),
  postDistributionLadderInsight({ internalActor: true }),
  creatorRepeatAfterDistributionInsight({ internalActor: true }),
  viewerToContributorInsight({ internalActor: true }),
  playlistCreationOutcomesInsight({ internalActor: true }),
];

async function detachDeprecatedInsights() {
  const insights = await listAll(`${scopePath}/insights/`);
  const deprecatedInsights = insights.filter((insight) => deprecatedInsightNames.includes(insight.name));

  for (const insight of deprecatedInsights) {
    if (dryRun) {
      console.log(`Would detach deprecated insight: ${insight.name}`);
      continue;
    }

    await api(`${scopePath}/insights/${insight.id}/`, {
      method: 'PATCH',
      body: { dashboards: [] },
    });
    console.log(`Detached deprecated insight: ${insight.name}`);
  }
}

async function api(path, { method = 'GET', body, allow404 = false } = {}) {
  const url = `${host}${path}`;

  if (dryRun) {
    return { dryRun: true, path, method, body };
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${personalApiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (allow404 && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return {};
  }

  return await response.json();
}

async function listAll(path) {
  const data = await api(`${path}?limit=200`);
  if (!data) return [];
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

async function upsertInsight(definition, dashboardId) {
  const insights = await listAll(`${scopePath}/insights/`);
  const namedMatches = insights.filter((insight) => insight.name === definition.name);

  if (namedMatches.length > 1) {
    const ids = namedMatches.map((insight) => insight.id).filter(Boolean).join(', ');
    console.warn(`Multiple insights named "${definition.name}" found (${ids || 'unknown ids'}).`);
  }

  let existing = namedMatches[0];
  if (dashboardId && namedMatches.length > 1) {
    const attached = namedMatches.find((insight) => Array.isArray(insight.dashboards)
      && insight.dashboards.includes(dashboardId));
    if (attached) {
      existing = attached;
    }
  }

  const payload = {
    name: definition.name,
    description: definition.description,
    derived_name: definition.name,
    dashboards: dashboardId ? [dashboardId] : [],
    ...(definition.query
      ? {
        query: definition.query,
        filters: {},
      }
      : {
        filters: definition.filters,
      }),
  };

  if (existing) {
    console.log(`Updating insight: ${definition.name} (${existing.id})`);
    if (dryRun) return { ...existing, id: existing.id || `${definition.key}-existing` };
    return await api(`${scopePath}/insights/${existing.id}/`, { method: 'PATCH', body: payload });
  }

  console.log(`Creating insight: ${definition.name}`);
  if (dryRun) return { id: `${definition.key}-new`, name: definition.name };
  return await api(`${scopePath}/insights/`, { method: 'POST', body: payload });
}

async function upsertDashboard(name, description) {
  const dashboards = await listAll(`${scopePath}/dashboards/`);
  const existing = dashboards.find((dashboard) => dashboard.name === name);

  const payload = {
    name,
    description,
  };

  if (existing) {
    console.log(`Using existing dashboard: ${name}`);
    if (!dryRun) {
      await api(`${scopePath}/dashboards/${existing.id}/`, { method: 'PATCH', body: payload });
    }
    return existing;
  }

  console.log(`Creating dashboard: ${name}`);
  if (dryRun) return { id: 'dry-dashboard', ...payload };
  return await api(`${scopePath}/dashboards/`, { method: 'POST', body: payload });
}

async function addInsightToDashboard(dashboardId, insightId, index) {
  if (dryRun) {
    console.log(`Would add insight ${insightId} to dashboard ${dashboardId} at position ${index}`);
    return;
  }

  const tilePayload = {
    insight: insightId,
    name: `Tile ${index + 1}`,
  };

  const primary = await api(`${scopePath}/dashboards/${dashboardId}/tiles/`, {
    method: 'POST',
    body: tilePayload,
    allow404: true,
  });

  if (primary !== null) {
    return;
  }

  const fallbackScope = projectScopePath || scopePath;
  await api(`${fallbackScope}/dashboard_tiles/`, {
    method: 'POST',
    body: {
      dashboard: dashboardId,
      insight: insightId,
      order: index,
    },
  });
}

async function clearDashboardTiles(dashboardId) {
  if (dryRun) {
    console.log(`Would clear existing tiles for dashboard ${dashboardId}`);
    return;
  }

  const dashboard = await api(`${scopePath}/dashboards/${dashboardId}/`);
  const tiles = Array.isArray(dashboard.tiles) ? dashboard.tiles : [];

  for (const tile of tiles) {
    const scopedDelete = await api(`${scopePath}/dashboard_tiles/${tile.id}/`, {
      method: 'DELETE',
      allow404: true,
    });

    if (scopedDelete !== null) {
      continue;
    }

    if (!projectScopePath) {
      throw new Error(
        `Unable to delete dashboard tile ${tile.id} using ${scopePath}; set POSTHOG_PROJECT_ID to enable project-scope fallback.`,
      );
    }

    await api(`${projectScopePath}/dashboard_tiles/${tile.id}/`, { method: 'DELETE' });
  }
}

async function main() {
  const modeLabel = pmfOnly ? 'pmf-only' : 'full';
  console.log(`PostHog provisioning started (${dryRun ? 'dry-run' : 'apply'}, ${modeLabel})`);
  console.log(`Host: ${host}`);
  console.log(`Scope: ${scopePath}`);

  const dashboardSpecs = [
    {
      name: dashboardName,
      description: 'Auto-provisioned dashboard for Cassette product analytics (external actors only).',
      insights: pmfOnly ? pmfProductInsightDefinitions : productInsightDefinitions,
    },
    {
      name: internalDashboardName,
      description: 'Auto-provisioned dashboard for Cassette internal team analytics (CassetteTeam actors).',
      insights: pmfOnly ? pmfInternalInsightDefinitions : internalInsightDefinitions,
    },
  ];

  let totalInsights = 0;
  for (const dashboardSpec of dashboardSpecs) {
    const dashboard = await upsertDashboard(dashboardSpec.name, dashboardSpec.description);
    for (const definition of dashboardSpec.insights) {
      await upsertInsight(definition, dashboard.id);
      totalInsights += 1;
    }
  }

  if (!pmfOnly) {
    await detachDeprecatedInsights();
  }

  console.log('Provisioning complete.');
  console.log(`Dashboards provisioned: ${dashboardSpecs.length}`);
  console.log(`Insights provisioned: ${totalInsights}`);
  console.log(`Dashboards: ${dashboardName}, ${internalDashboardName}`);
  console.log('Insights linked to dashboards via insight.dashboards.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
