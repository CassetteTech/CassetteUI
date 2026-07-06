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
const growthOnly = process.argv.includes('--growth-only');
const playlistConversionsOnly = process.argv.includes('--playlist-conversions-only');
const postsCreatedOnly = process.argv.includes('--posts-created-only');
const redditBotOnly = process.argv.includes('--reddit-bot-only');

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
const TIME_SERIES_LOOKBACK_DAYS = 90;
const EXTERNAL_ACTOR_CONDITION = '  and coalesce(toBool(properties.internal_actor), false) = false';
const ORIGINAL_POST_CONDITION = "  and coalesce(toString(properties.is_repost), 'false') = 'false'";
const CORE_ACTION_CONDITION = '  and coalesce(toBool(properties.core_action), false) = true';
const POST_SURFACE_CONDITION = "  and coalesce(toString(properties.source_surface), '') = 'post'";
function actorExpression(tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return `coalesce(nullIf(toString(${prefix}properties.user_id), ''), nullIf(toString(${prefix}person_id), ''), ${prefix}distinct_id)`;
}

const ACTOR_EXPRESSION = actorExpression();
const productCoreActionEvents = [
  'link_converted',
  'post_created',
  'profile_updated',
  'playlist_created_on_platform',
  'music_service_connected',
  'onboarding_completed',
];
const contentCoreActionEvents = ['link_converted', 'post_created'];

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

function eventNameList(events) {
  return events.map((eventName) => `'${eventName}'`).join(', ');
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
    `    ${ACTOR_EXPRESSION} as creator_actor_id,`,
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
    '    and timestamp >= now() - INTERVAL 67 DAY',
    '    and timestamp < now() - INTERVAL 23 DAY',
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
    '), repeat_posts as (',
    '  select',
    `    ${ACTOR_EXPRESSION} as creator_actor_id,`,
    '    timestamp',
    '  from events',
    "  where event = 'post_created'",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '    and coalesce(toBool(properties.is_repost), false) = false',
    '    and timestamp >= now() - INTERVAL 67 DAY',
    '    and timestamp < now()',
    '), creator_next_post as (',
    '  select',
    '    d.creator_actor_id,',
    '    d.first_distributed_at,',
    '    min(if(p.timestamp > d.first_distributed_at and p.timestamp < d.first_distributed_at + INTERVAL 30 DAY, p.timestamp, null)) as next_post_at',
    '  from creator_first_distributed d',
    '  left join repeat_posts p',
    '    on p.creator_actor_id = d.creator_actor_id',
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
    `    ${ACTOR_EXPRESSION} as viewer_actor_id,`,
    '    min(timestamp) as first_view_at,',
    "    argMin(coalesce(toString(properties.is_authenticated), 'false'), timestamp) as first_view_authenticated",
    '  from events',
    "  where event = 'post_viewed'",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    "    and coalesce(toString(properties.is_creator_view), 'false') = 'false'",
    '    and timestamp >= now() - INTERVAL 44 DAY',
    '    and timestamp < now() - INTERVAL 14 DAY',
    '  group by viewer_actor_id',
    '), auth_events as (',
    '  select',
    `    ${ACTOR_EXPRESSION} as viewer_actor_id,`,
    '    timestamp',
    '  from events',
    "  where event in ('auth_signed_up', 'auth_signed_in', 'auth_google_oauth_completed')",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '    and timestamp >= now() - INTERVAL 44 DAY',
    '    and timestamp < now()',
    '), post_events as (',
    '  select',
    `    ${ACTOR_EXPRESSION} as viewer_actor_id,`,
    '    timestamp',
    '  from events',
    "  where event = 'post_created'",
    `    and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '    and coalesce(toBool(properties.is_repost), false) = false',
    '    and timestamp >= now() - INTERVAL 44 DAY',
    '    and timestamp < now()',
    '), viewer_auth as (',
    '  select',
    '    v.viewer_actor_id,',
    '    min(if(a.timestamp > v.first_view_at and a.timestamp < v.first_view_at + INTERVAL 7 DAY, a.timestamp, null)) as auth_success_at',
    '  from viewer_first_touch v',
    '  left join auth_events a',
    '    on a.viewer_actor_id = v.viewer_actor_id',
    '  group by v.viewer_actor_id',
    '), viewer_post as (',
    '  select',
    '    v.viewer_actor_id,',
    '    min(if(p.timestamp > v.first_view_at and p.timestamp < v.first_view_at + INTERVAL 14 DAY, p.timestamp, null)) as first_post_at',
    '  from viewer_first_touch v',
    '  left join post_events p',
    '    on p.viewer_actor_id = v.viewer_actor_id',
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
    "  countIf(event = 'playlist_created_on_platform') as conversions,",
    "  countIf(event = 'playlist_creation_failed') as failed,",
    "  if(countIf(event = 'playlist_creation_submitted') = 0, 0, round(100.0 * countIf(event = 'playlist_created_on_platform') / countIf(event = 'playlist_creation_submitted'), 2)) as conversions_per_submit_pct,",
    "  if(countIf(event = 'playlist_created_on_platform') = 0, 0, round(avgIf(toFloatOrDefault(toString(properties.tracks_failed), 0), event = 'playlist_created_on_platform'), 2)) as avg_tracks_failed_per_conversion,",
    "  if(countIf(event = 'playlist_created_on_platform') = 0, 0, round(avgIf(toFloatOrDefault(toString(properties.total_tracks), 0), event = 'playlist_created_on_platform'), 2)) as avg_tracks_attempted_per_conversion",
    'from events',
    "where event in ('playlist_creation_submitted', 'playlist_creation_blocked', 'playlist_created_on_platform', 'playlist_creation_failed')",
    `  and coalesce(toBool(properties.internal_actor), false) = ${internalActorLiteral}`,
    '  and timestamp >= now() - INTERVAL 90 DAY',
    'group by target_platform',
    'order by submitted desc, target_platform asc',
  ].join('\n');
}

function playlistCreationOutcomesInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}playlist_creation_outcomes`,
    name: `${prefix}Playlist Conversion Outcomes`,
    previousNames: [`${prefix}Playlist Creation Outcomes`],
    description: `${prefix || ''}90-day playlist conversion submitted, blocked, failed, and converted outcomes by target platform.`,
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
      ? 'Internal playlist conversion flow: post_viewed -> playlist convert CTA click -> playlist_created_on_platform.'
      : 'Playlist conversion flow: post_viewed -> playlist convert CTA click -> playlist_created_on_platform.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: 'post_viewed',
            name: 'post_viewed',
            properties: [
              internalActorPropertyFilter(internalActor),
              {
                key: 'source_surface',
                value: 'post',
                operator: 'exact',
                type: 'event',
              },
              {
                key: 'is_creator_view',
                value: 'false',
                operator: 'exact',
                type: 'event',
              },
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
              {
                key: 'source_surface',
                value: 'post',
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
              {
                key: 'source_surface',
                value: 'post',
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

function creatorIntentActivationFunnelInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}creator_intent_activation`,
    name: `${prefix}Creator Intent Activation Funnel`,
    description: `${prefix || ''}Explicit creator intent flow: conversion_entry_started -> original website post_created.`,
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
            event: 'post_created',
            name: 'website post_created',
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

function accountToWebsitePostFunnelInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}account_to_website_post_funnel`,
    name: `${prefix}Account to Website Post Funnel`,
    description: `${prefix || ''}New account activation flow: account_created -> onboarding_completed -> original website post_created.`,
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: 'account_created',
            name: 'account_created',
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
            event: 'post_created',
            name: 'website post_created',
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

function postViewerConversionFunnelInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}conversion_funnel`,
    name: `${prefix}Post Viewer to Platform Click Funnel`,
    previousNames: [`${prefix}Conversion Funnel`],
    description: `${prefix || ''}Post viewer conversion flow: non-creator post_viewed -> post_platform_conversion_clicked.`,
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: 'post_viewed',
            name: 'post_viewed',
            properties: [
              internalActorPropertyFilter(internalActor),
              {
                key: 'source_surface',
                value: 'post',
                operator: 'exact',
                type: 'event',
              },
              {
                key: 'is_creator_view',
                value: 'false',
                operator: 'exact',
                type: 'event',
              },
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_platform_conversion_clicked',
            name: 'post_platform_conversion_clicked',
            properties: [
              internalActorPropertyFilter(internalActor),
              {
                key: 'source_surface',
                value: 'post',
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

function postViewerSignupToWebsitePostFunnelInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  return {
    key: `${keyPrefix}post_viewer_signup_to_website_post_funnel`,
    name: `${prefix}Post Viewer Signup to Website Post Funnel`,
    description: `${prefix || ''}Non-creator viewer flow: post_viewed -> account_created -> original website post_created.`,
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: 'post_viewed',
            name: 'post_viewed',
            properties: [
              internalActorPropertyFilter(internalActor),
              {
                key: 'source_surface',
                value: 'post',
                operator: 'exact',
                type: 'event',
              },
              {
                key: 'is_creator_view',
                value: 'false',
                operator: 'exact',
                type: 'event',
              },
            ],
          },
          {
            kind: 'EventsNode',
            event: 'account_created',
            name: 'account_created',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_created',
            name: 'website post_created',
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

function onboardingActivationFunnelInsight({ internalActor }) {
  const prefix = internalActor ? 'Internal ' : '';
  const keyPrefix = internalActor ? 'internal_' : '';

  function onboardingStep(step) {
    return {
      kind: 'EventsNode',
      event: 'onboarding_step_completed',
      name: `onboarding_step_completed (${step})`,
      properties: [
        internalActorPropertyFilter(internalActor),
        {
          key: 'step',
          value: step,
          operator: 'exact',
          type: 'event',
        },
      ],
    };
  }

  return {
    key: `${keyPrefix}onboarding_activation`,
    name: `${prefix}Onboarding Activation Funnel`,
    description: `${prefix || ''}Account creation through onboarding start, handle, avatar, music preferences, and completion.`,
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: 'account_created',
            name: 'account_created',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'onboarding_started',
            name: 'onboarding_started',
            properties: [
              internalActorPropertyFilter(internalActor),
            ],
          },
          onboardingStep('handle'),
          onboardingStep('avatar'),
          onboardingStep('music'),
          {
            kind: 'EventsNode',
            event: 'onboarding_completed',
            name: 'onboarding_completed',
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

function hogqlLineGraphInsight({
  key,
  name,
  previousNames,
  description,
  query,
  yAxisColumn,
  yAxisLabel,
  yAxis,
}) {
  const yAxisSeries = yAxis || [
    {
      column: yAxisColumn,
      label: yAxisLabel,
    },
  ];

  return {
    key,
    name,
    previousNames,
    description,
    query: {
      kind: 'DataVisualizationNode',
      display: 'ActionsLineGraph',
      source: {
        kind: 'HogQLQuery',
        query,
      },
      chartSettings: {
        xAxis: {
          column: 'day',
        },
        yAxis: yAxisSeries.map((series) => ({
          column: series.column,
          settings: {
            formatting: {
              style: 'short',
            },
            display: {
              label: series.label,
              displayType: 'line',
            },
          },
        })),
        showLegend: yAxisSeries.length > 1,
        showNullsAsZero: true,
        showTotalRow: false,
        leftYAxisSettings: {
          startAtZero: true,
        },
      },
    },
  };
}

function hogqlDataTableInsight({ key, name, previousNames, description, query }) {
  return {
    key,
    name,
    previousNames,
    description,
    query: {
      kind: 'DataTableNode',
      source: {
        kind: 'HogQLQuery',
        query,
      },
    },
  };
}

function contentEngagementQualityQuery() {
  return [
    'with filtered as (',
    '  select',
    '    event,',
    '    properties,',
    `    ${ACTOR_EXPRESSION} as actor_id`,
    '  from events',
    "  where event in ('post_created', 'post_viewed', 'post_platform_conversion_clicked')",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    '), by_type as (',
    '  select',
    "    coalesce(nullIf(toString(properties.element_type), ''), 'unknown') as element_type,",
    "    uniqExactIf(toString(properties.post_id), event = 'post_created' and properties.post_id is not null and coalesce(toString(properties.is_repost), 'false') = 'false') as posts_created,",
    "    countIf(event = 'post_viewed' and coalesce(toString(properties.is_creator_view), 'false') = 'false') as non_creator_views,",
    "    uniqExactIf(actor_id, event = 'post_viewed' and coalesce(toString(properties.is_creator_view), 'false') = 'false') as non_creator_viewers,",
    "    countIf(event = 'post_platform_conversion_clicked' and coalesce(toString(properties.source_surface), '') = 'post') as platform_clicks,",
    "    uniqExactIf(actor_id, event = 'post_platform_conversion_clicked' and coalesce(toString(properties.source_surface), '') = 'post') as platform_clickers",
    '  from filtered',
    '  group by element_type',
    ')',
    'select',
    '  element_type,',
    '  posts_created,',
    '  non_creator_views,',
    '  non_creator_viewers,',
    '  platform_clicks,',
    '  platform_clickers,',
    '  if(non_creator_views = 0, 0, round(100.0 * platform_clicks / non_creator_views, 2)) as clicks_per_view_pct,',
    '  if(non_creator_viewers = 0, 0, round(100.0 * platform_clickers / non_creator_viewers, 2)) as clicker_rate_pct',
    'from by_type',
    'order by platform_clicks desc, non_creator_views desc, element_type asc',
  ].join('\n');
}

function contentEngagementQualityInsight() {
  return hogqlDataTableInsight({
    key: 'content_engagement_quality',
    name: 'Content Engagement Quality',
    description: '90-day view and platform-click quality by content type, showing what people actually engage with.',
    query: contentEngagementQualityQuery(),
  });
}

function platformDemandMatrixQuery() {
  return [
    'select',
    "  coalesce(nullIf(toString(properties.source_platform), ''), 'unknown') as source_platform,",
    "  coalesce(nullIf(toString(properties.target_platform), ''), 'unknown') as target_platform,",
    "  coalesce(nullIf(toString(properties.source_context), ''), 'unknown') as source_context,",
    '  count() as clicks,',
    `  uniqExact(${ACTOR_EXPRESSION}) as clickers,`,
    "  countIf(coalesce(toString(properties.is_authenticated), 'false') = 'false') as signed_out_clicks",
    'from events',
    "where event = 'post_platform_conversion_clicked'",
    '  and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    POST_SURFACE_CONDITION,
    'group by source_platform, target_platform, source_context',
    'order by clicks desc, clickers desc, source_platform asc, target_platform asc',
    'limit 50',
  ].join('\n');
}

function platformDemandMatrixInsight() {
  return hogqlDataTableInsight({
    key: 'platform_demand_matrix',
    name: 'Platform Demand Matrix',
    description: '90-day source-to-target platform demand from post-page platform clicks.',
    query: platformDemandMatrixQuery(),
  });
}

function playlistConversionFrictionQuery() {
  return [
    'with by_platform as (',
    '  select',
    "    coalesce(nullIf(toString(properties.target_platform), ''), 'unknown') as target_platform,",
    "    countIf(event = 'post_platform_conversion_clicked' and coalesce(toString(properties.source_context), '') = 'playlist_convert_button') as convert_clicks,",
    "    countIf(event = 'playlist_creation_submitted') as submitted,",
    "    countIf(event = 'playlist_creation_blocked') as blocked,",
    "    countIf(event = 'playlist_creation_blocked' and coalesce(toString(properties.reason_code), '') = 'auth_required') as auth_required_blocks,",
    "    countIf(event = 'playlist_created_on_platform') as created,",
    "    countIf(event = 'playlist_creation_failed') as failed",
    '  from events',
    "  where event in ('post_platform_conversion_clicked', 'playlist_creation_submitted', 'playlist_creation_blocked', 'playlist_created_on_platform', 'playlist_creation_failed')",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    '  group by target_platform',
    ')',
    'select',
    '  target_platform,',
    '  convert_clicks,',
    '  submitted,',
    '  blocked,',
    '  auth_required_blocks,',
    '  created,',
    '  failed,',
    '  if(convert_clicks = 0, 0, round(100.0 * created / convert_clicks, 2)) as created_per_click_pct,',
    '  if(convert_clicks = 0, 0, round(100.0 * auth_required_blocks / convert_clicks, 2)) as auth_block_per_click_pct,',
    '  if(submitted = 0, 0, round(100.0 * failed / submitted, 2)) as failure_per_submit_pct',
    'from by_platform',
    'order by convert_clicks desc, target_platform asc',
  ].join('\n');
}

function playlistConversionFrictionInsight() {
  return hogqlDataTableInsight({
    key: 'playlist_conversion_friction',
    name: 'Playlist Conversion Friction',
    description: '90-day playlist save friction by target platform: intent, auth blocks, created playlists, and failures.',
    query: playlistConversionFrictionQuery(),
  });
}

function signedOutConversionIntentQuery() {
  return [
    'select',
    "  coalesce(nullIf(toString(properties.source_context), ''), 'unknown') as source_context,",
    "  coalesce(nullIf(toString(properties.target_platform), ''), 'unknown') as target_platform,",
    '  count() as signed_out_clicks,',
    `  uniqExact(${ACTOR_EXPRESSION}) as signed_out_clickers`,
    'from events',
    "where event = 'post_platform_conversion_clicked'",
    '  and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    POST_SURFACE_CONDITION,
    "  and coalesce(toString(properties.is_authenticated), 'false') = 'false'",
    'group by source_context, target_platform',
    'order by signed_out_clicks desc, signed_out_clickers desc, source_context asc',
    'limit 50',
  ].join('\n');
}

function signedOutConversionIntentInsight() {
  return hogqlDataTableInsight({
    key: 'signed_out_conversion_intent',
    name: 'Signed-Out Conversion Intent',
    description: '90-day post-page platform clicks from signed-out visitors, showing account-wall demand.',
    query: signedOutConversionIntentQuery(),
  });
}

function signupAttributionMixQuery() {
  return [
    'select',
    "  coalesce(nullIf(toString(properties.traffic_source), ''), nullIf(toString(properties.signup_source), ''), nullIf(toString(properties.first_touch_source), ''), 'unknown') as signup_source,",
    "  coalesce(nullIf(toString(properties.traffic_medium), ''), nullIf(toString(properties.signup_medium), ''), 'unknown') as signup_medium,",
    "  coalesce(nullIf(toString(properties.auth_provider), ''), 'unknown') as auth_provider,",
    '  count() as accounts_created,',
    `  uniqExact(${ACTOR_EXPRESSION}) as unique_accounts,`,
    "  countIf(coalesce(nullIf(toString(properties.reddit_subreddit), ''), nullIf(toString(properties.traffic_content), '')) is not null) as reddit_attributed_accounts",
    'from events',
    "where event = 'account_created'",
    '  and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    'group by signup_source, signup_medium, auth_provider',
    'order by accounts_created desc, signup_source asc, signup_medium asc',
    'limit 50',
  ].join('\n');
}

function signupAttributionMixInsight() {
  return hogqlDataTableInsight({
    key: 'signup_attribution_mix',
    name: 'Signup Attribution Mix',
    description: '90-day account creation mix by source, medium, and auth provider.',
    query: signupAttributionMixQuery(),
  });
}

function creatorStickinessQuery() {
  return [
    'with creator_posts as (',
    '  select',
    `    ${ACTOR_EXPRESSION} as actor_id,`,
    '    uniqExact(toString(properties.post_id)) as posts_created,',
    '    min(toDate(timestamp)) as first_post_day,',
    '    max(toDate(timestamp)) as latest_post_day',
    '  from events',
    "  where event = 'post_created'",
    '    and timestamp >= now() - INTERVAL 180 DAY',
    EXTERNAL_ACTOR_CONDITION,
    '    and properties.post_id is not null',
    ORIGINAL_POST_CONDITION,
    '  group by actor_id',
    ')',
    'select',
    '  count() as creators,',
    '  countIf(posts_created >= 2) as repeat_creators,',
    '  countIf(posts_created >= 3) as three_plus_post_creators,',
    "  countIf(latest_post_day >= toDate(now() - INTERVAL 30 DAY)) as active_creators_30d,",
    '  round(avg(posts_created), 2) as avg_posts_per_creator,',
    '  if(count() = 0, 0, round(100.0 * countIf(posts_created >= 2) / count(), 2)) as repeat_creator_pct,',
    "  if(count() = 0, 0, round(100.0 * countIf(latest_post_day >= toDate(now() - INTERVAL 30 DAY)) / count(), 2)) as active_creator_pct_30d",
    'from creator_posts',
  ].join('\n');
}

function creatorStickinessInsight() {
  return hogqlDataTableInsight({
    key: 'creator_stickiness',
    name: 'Creator Stickiness',
    description: '180-day creator repeat behavior: repeat creators, three-plus-post creators, and recent active creators.',
    query: creatorStickinessQuery(),
  });
}

function viewerReturnQualityQuery() {
  return [
    'with viewer_activity as (',
    '  select',
    `    ${ACTOR_EXPRESSION} as actor_id,`,
    '    count() as post_views,',
    '    uniqExact(toDate(timestamp)) as view_days,',
    '    max(toDate(timestamp)) as latest_view_day',
    '  from events',
    "  where event = 'post_viewed'",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    "    and coalesce(toString(properties.is_creator_view), 'false') = 'false'",
    '  group by actor_id',
    ')',
    'select',
    '  count() as viewers,',
    '  countIf(view_days >= 2) as returning_viewers_2plus_days,',
    '  countIf(post_views >= 5) as highly_engaged_viewers_5plus_views,',
    "  countIf(latest_view_day >= toDate(now() - INTERVAL 30 DAY)) as active_viewers_30d,",
    '  round(avg(post_views), 2) as avg_views_per_viewer,',
    '  round(avg(view_days), 2) as avg_view_days_per_viewer,',
    '  if(count() = 0, 0, round(100.0 * countIf(view_days >= 2) / count(), 2)) as return_viewer_pct',
    'from viewer_activity',
  ].join('\n');
}

function viewerReturnQualityInsight() {
  return hogqlDataTableInsight({
    key: 'viewer_return_quality',
    name: 'Viewer Return Quality',
    description: '90-day non-creator viewer return behavior: repeat view days and high-engagement viewers.',
    query: viewerReturnQualityQuery(),
  });
}

function platformPreferenceStickinessQuery() {
  return [
    'select',
    '  target_platform,',
    '  count() as clicks,',
    '  uniqExact(actor_id) as clickers,',
    '  uniqExactIf(actor_id, actor_platform_clicks >= 2) as repeat_clickers,',
    '  if(uniqExact(actor_id) = 0, 0, round(100.0 * uniqExactIf(actor_id, actor_platform_clicks >= 2) / uniqExact(actor_id), 2)) as repeat_clicker_pct',
    'from (',
    '  select',
    "    coalesce(nullIf(toString(properties.target_platform), ''), 'unknown') as target_platform,",
    `    ${ACTOR_EXPRESSION} as actor_id,`,
    `    count() over (partition by coalesce(nullIf(toString(properties.target_platform), ''), 'unknown'), ${ACTOR_EXPRESSION}) as actor_platform_clicks`,
    '  from events',
    "  where event = 'post_platform_conversion_clicked'",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    POST_SURFACE_CONDITION,
    ') as clicks_with_actor_counts',
    'group by target_platform',
    'order by clicks desc, clickers desc, target_platform asc',
  ].join('\n');
}

function platformPreferenceStickinessInsight() {
  return hogqlDataTableInsight({
    key: 'platform_preference_stickiness',
    name: 'Platform Preference Stickiness',
    description: '90-day repeat platform click behavior by target streaming platform.',
    query: platformPreferenceStickinessQuery(),
  });
}

function redditSubredditBusinessQualityQuery() {
  return [
    'select',
    `  ${redditSubredditExpression()} as subreddit,`,
    "  countIf(event = '$pageview') as pageviews,",
    `  uniqExactIf(${ACTOR_EXPRESSION}, event = '$pageview') as visitors,`,
    "  countIf(event = 'account_created') as accounts_created,",
    "  countIf(event = 'post_platform_conversion_clicked') as platform_clicks,",
    "  countIf(event = 'playlist_created_on_platform') as playlists_created_on_platform",
    'from events',
    "where event in ('$pageview', 'account_created', 'post_platform_conversion_clicked', 'playlist_created_on_platform')",
    '  and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    redditBotCondition(),
    'group by subreddit',
    'order by visitors desc, platform_clicks desc, accounts_created desc, subreddit asc',
    'limit 50',
  ].join('\n');
}

function redditSubredditBusinessQualityInsight() {
  return hogqlDataTableInsight({
    key: 'reddit_subreddit_business_quality',
    name: 'Reddit Subreddit Business Quality',
    description: '90-day Reddit bot traffic quality by subreddit: visitors, signups, platform clicks, and playlist saves.',
    query: redditSubredditBusinessQualityQuery(),
  });
}

function searchIntentQualityQuery() {
  const resultCountExpression = "toFloatOrDefault(toString(properties.result_count), 0)";

  return [
    'with by_surface as (',
    '  select',
    "    coalesce(nullIf(toString(properties.source_surface), ''), 'unknown') as source_surface,",
    "    countIf(event = 'search_submitted') as searches,",
    `    countIf(event = 'search_submitted' and ${resultCountExpression} = 0) as zero_result_searches,`,
    "    countIf(event = 'search_result_selected') as result_selections,",
    `    uniqExactIf(${ACTOR_EXPRESSION}, event = 'search_submitted') as searchers,`,
    `    uniqExactIf(${ACTOR_EXPRESSION}, event = 'search_result_selected') as selectors`,
    '  from events',
    "  where event in ('search_submitted', 'search_result_selected')",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    '  group by source_surface',
    ')',
    'select',
    '  source_surface,',
    '  searches,',
    '  zero_result_searches,',
    '  result_selections,',
    '  searchers,',
    '  selectors,',
    '  if(searches = 0, 0, round(100.0 * result_selections / searches, 2)) as selection_per_search_pct,',
    '  if(searches = 0, 0, round(100.0 * zero_result_searches / searches, 2)) as zero_result_pct',
    'from by_surface',
    'order by searches desc, source_surface asc',
  ].join('\n');
}

function searchIntentQualityInsight() {
  return hogqlDataTableInsight({
    key: 'search_intent_quality',
    name: 'Search Intent Quality',
    description: '90-day search demand and result-selection quality by surface.',
    query: searchIntentQualityQuery(),
  });
}

function searchIntentToPostFunnelInsight() {
  return {
    key: 'search_intent_to_post_funnel',
    name: 'Search Intent to Website Post Funnel',
    description: 'Search activation flow: search_submitted -> search_result_selected -> original website post_created.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: 'search_submitted',
            name: 'search_submitted',
            properties: [
              internalActorPropertyFilter(false),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'search_result_selected',
            name: 'search_result_selected',
            properties: [
              internalActorPropertyFilter(false),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_created',
            name: 'website post_created',
            properties: [
              internalActorPropertyFilter(false),
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

function unsupportedLinkDemandQuery() {
  return [
    'with by_input as (',
    '  select',
    "    coalesce(nullIf(toString(properties.source_surface), ''), 'unknown') as source_surface,",
    "    coalesce(nullIf(toString(properties.source_platform), ''), 'unknown') as source_platform,",
    "    coalesce(nullIf(toString(properties.element_type_guess), ''), 'unknown') as element_type_guess,",
    "    countIf(event = 'music_link_pasted') as supported_pastes,",
    "    countIf(event = 'unsupported_music_link_pasted') as unsupported_pastes,",
    `    uniqExactIf(${ACTOR_EXPRESSION}, event = 'unsupported_music_link_pasted') as unsupported_users`,
    '  from events',
    "  where event in ('music_link_pasted', 'unsupported_music_link_pasted')",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    '  group by source_surface, source_platform, element_type_guess',
    ')',
    'select',
    '  source_surface,',
    '  source_platform,',
    '  element_type_guess,',
    '  supported_pastes,',
    '  unsupported_pastes,',
    '  unsupported_users,',
    '  if(supported_pastes + unsupported_pastes = 0, 0, round(100.0 * unsupported_pastes / (supported_pastes + unsupported_pastes), 2)) as unsupported_rate_pct',
    'from by_input',
    'where unsupported_pastes > 0',
    'order by unsupported_pastes desc, unsupported_users desc, source_surface asc',
    'limit 50',
  ].join('\n');
}

function unsupportedLinkDemandInsight() {
  return hogqlDataTableInsight({
    key: 'unsupported_link_demand',
    name: 'Unsupported Link Demand',
    description: '90-day unsupported pasted-link demand by surface, guessed platform, and guessed content type.',
    query: unsupportedLinkDemandQuery(),
  });
}

function pageEngagementQualityQuery() {
  const durationExpression = "toFloatOrDefault(toString(properties.$prev_pageview_duration), 0)";

  return [
    'with by_surface as (',
    '  select',
    "    coalesce(nullIf(toString(properties.source_surface), ''), 'unknown') as source_surface,",
    '    count() as pageleaves,',
    `    uniqExact(${ACTOR_EXPRESSION}) as visitors,`,
    `    round(avg(${durationExpression}), 2) as avg_duration_seconds,`,
    `    countIf(${durationExpression} < 5) as short_visits_under_5s`,
    '  from events',
    "  where event = '$pageleave'",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    '  group by source_surface',
    ')',
    'select',
    '  source_surface,',
    '  pageleaves,',
    '  visitors,',
    '  avg_duration_seconds,',
    '  short_visits_under_5s,',
    '  if(pageleaves = 0, 0, round(100.0 * short_visits_under_5s / pageleaves, 2)) as short_visit_pct',
    'from by_surface',
    'order by pageleaves desc, source_surface asc',
  ].join('\n');
}

function pageEngagementQualityInsight() {
  return hogqlDataTableInsight({
    key: 'page_engagement_quality',
    name: 'Page Engagement Quality',
    description: '90-day pageleave engagement by surface: average duration and short-visit rate.',
    query: pageEngagementQualityQuery(),
  });
}

function issueReportHotspotsQuery() {
  return [
    'with by_issue_type as (',
    '  select',
    "    coalesce(nullIf(toString(properties.report_type), ''), 'unknown') as report_type,",
    "    coalesce(nullIf(toString(properties.source_surface), ''), 'unknown') as source_surface,",
    "    coalesce(nullIf(toString(properties.source_context), ''), 'unknown') as source_context,",
    '    count() as reports_submitted,',
    `    uniqExact(${ACTOR_EXPRESSION}) as reporters,`,
    "    countIf(coalesce(toBool(properties.has_description), false)) as reports_with_description,",
    "    countIf(coalesce(toBool(properties.has_conversion_context), false)) as reports_with_conversion_context",
    '  from events',
    "  where event = 'issue_report_submitted'",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    '  group by report_type, source_surface, source_context',
    ')',
    'select',
    '  report_type,',
    '  source_surface,',
    '  source_context,',
    '  reports_submitted,',
    '  reporters,',
    '  reports_with_description,',
    '  reports_with_conversion_context,',
    '  if(reports_submitted = 0, 0, round(100.0 * reports_with_conversion_context / reports_submitted, 2)) as conversion_context_pct',
    'from by_issue_type',
    'order by reports_submitted desc, reporters desc, report_type asc',
    'limit 50',
  ].join('\n');
}

function issueReportHotspotsInsight() {
  return hogqlDataTableInsight({
    key: 'issue_report_hotspots',
    name: 'Issue Report Hotspots',
    description: '90-day user-submitted issue report volume by report type, surface, and source context.',
    query: issueReportHotspotsQuery(),
  });
}

function filteredEventsCte(eventName, extraConditions) {
  return [
    'filtered as (',
    'select',
    '  timestamp,',
    '  person_id,',
    '  distinct_id,',
    '  properties',
    'from events',
    `where event = '${eventName}'`,
    EXTERNAL_ACTOR_CONDITION,
    ...extraConditions,
    ')',
  ].join('\n');
}

function dateSeriesCtes() {
  const startDayExpression = `addDays(toDate(now()), -${TIME_SERIES_LOOKBACK_DAYS})`;

  return [
    'bounds as (',
    '  select',
    `    ${startDayExpression} as start_day,`,
    '    toDate(now()) as end_day',
    '), dates as (',
    '  select',
    "    addDays(start_day, arrayJoin(range(toInt(greatest(dateDiff('day', start_day, end_day) + 1, 0))))) as day",
    '  from bounds',
    ')',
  ].join('\n');
}

function dailyEventQuery({ eventName, valueAlias, aggregate, extraConditions = [], additionalAggregates = [] }) {
  const aggregates = [
    { alias: valueAlias, aggregate },
    ...additionalAggregates,
  ];

  return [
    'with',
    `${filteredEventsCte(eventName, extraConditions)},`,
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'daily as (',
    '  select',
    '    toDate(timestamp) as day,',
    ...aggregates.map((definition, index) => {
      const suffix = index === aggregates.length - 1 ? '' : ',';
      return `    ${definition.aggregate} as ${definition.alias}${suffix}`;
    }),
    '  from filtered',
    '  group by day',
    ')',
    'select',
    '  dates.day,',
    ...aggregates.map((definition, index) => {
      const suffix = index === aggregates.length - 1 ? '' : ',';
      return `  coalesce(daily.${definition.alias}, 0) as ${definition.alias}${suffix}`;
    }),
    'from dates',
    'left join daily on daily.day = dates.day',
    'order by dates.day asc',
  ].join('\n');
}

function cumulativeEventQuery({ eventName, dailyAlias, totalAlias, aggregate, extraConditions = [] }) {
  return [
    'with',
    `${filteredEventsCte(eventName, extraConditions)},`,
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'daily as (',
    '  select',
    '    toDate(timestamp) as day,',
    `    ${aggregate} as ${dailyAlias}`,
    '  from filtered',
    '  group by day',
    '), prior as (',
    '  select',
    `    ${aggregate} as prior_total`,
    '  from filtered, bounds',
    '  where toDate(timestamp) < bounds.start_day',
    ')',
    'select',
    '  dates.day,',
    `  coalesce(daily.${dailyAlias}, 0) as ${dailyAlias},`,
    `  prior.prior_total + sum(coalesce(daily.${dailyAlias}, 0)) over (order by dates.day asc rows between unbounded preceding and current row) as ${totalAlias}`,
    'from dates',
    'left join daily on daily.day = dates.day',
    'cross join prior',
    'order by dates.day asc',
  ].join('\n');
}

function cumulativeFirstActorEventQuery({
  eventName,
  dailyAlias,
  totalAlias,
  actorAlias,
  actorExpression = ACTOR_EXPRESSION,
  extraConditions = [],
}) {
  return [
    'with',
    `${filteredEventsCte(eventName, extraConditions)},`,
    'first_seen as (',
    '  select',
    `    ${actorExpression} as ${actorAlias},`,
    '    min(toDate(timestamp)) as first_seen_day',
    '  from filtered',
    `  group by ${actorAlias}`,
    '),',
    `${dateSeriesCtes('first_seen', 'first_seen_day')},`,
    'daily as (',
    '  select',
    '    first_seen_day as day,',
    `    count() as ${dailyAlias}`,
    '  from first_seen',
    '  group by day',
    '), prior as (',
    '  select',
    '    count() as prior_total',
    '  from first_seen, bounds',
    '  where first_seen_day < bounds.start_day',
    ')',
    'select',
    '  dates.day,',
    `  coalesce(daily.${dailyAlias}, 0) as ${dailyAlias},`,
    `  prior.prior_total + sum(coalesce(daily.${dailyAlias}, 0)) over (order by dates.day asc rows between unbounded preceding and current row) as ${totalAlias}`,
    'from dates',
    'left join daily on daily.day = dates.day',
    'cross join prior',
    'order by dates.day asc',
  ].join('\n');
}

function siteVisitorsUniqueQuery() {
  return dailyEventQuery({
    eventName: '$pageview',
    valueAlias: 'unique_visitors',
    aggregate: `uniqExact(${ACTOR_EXPRESSION})`,
  });
}

function siteVisitorsUniqueInsight() {
  return hogqlLineGraphInsight({
    key: 'site_visitors_unique',
    name: 'Site Visitors (Unique)',
    description: 'Daily distinct visitors who loaded the site, including visitors who did not take a product action.',
    query: siteVisitorsUniqueQuery(),
    yAxisColumn: 'unique_visitors',
    yAxisLabel: 'Unique visitors',
  });
}

function totalUniqueSiteVisitorsQuery() {
  return cumulativeFirstActorEventQuery({
    eventName: '$pageview',
    dailyAlias: 'new_unique_visitors',
    totalAlias: 'total_unique_visitors',
    actorAlias: 'visitor_id',
  });
}

function totalUniqueSiteVisitorsInsight() {
  return hogqlLineGraphInsight({
    key: 'total_unique_site_visitors',
    name: 'Total Unique Visitors (All Time)',
    description: 'Cumulative distinct visitors who loaded the site, based on retained pageview history.',
    query: totalUniqueSiteVisitorsQuery(),
    yAxisColumn: 'total_unique_visitors',
    yAxisLabel: 'Total unique visitors',
  });
}

function accountsCreatedPerDayInsight() {
  const accountActorExpression = "coalesce(nullIf(toString(properties.user_id), ''), distinct_id)";

  return hogqlLineGraphInsight({
    key: 'accounts_created_per_day',
    name: 'Accounts Created Per Day',
    description: 'Daily external accounts created from canonical account_created events, split by auth provider.',
    query: dailyEventQuery({
      eventName: 'account_created',
      valueAlias: 'accounts_created',
      aggregate: `uniqExact(${accountActorExpression})`,
      additionalAggregates: [
        {
          alias: 'email_accounts_created',
          aggregate: `uniqExactIf(${accountActorExpression}, coalesce(toString(properties.auth_provider), '') = 'email')`,
        },
        {
          alias: 'google_accounts_created',
          aggregate: `uniqExactIf(${accountActorExpression}, coalesce(toString(properties.auth_provider), '') = 'google')`,
        },
      ],
    }),
    yAxis: [
      {
        column: 'accounts_created',
        label: 'Total accounts',
      },
      {
        column: 'email_accounts_created',
        label: 'Email accounts',
      },
      {
        column: 'google_accounts_created',
        label: 'Google accounts',
      },
    ],
  });
}

function totalAccountsCreatedInsight() {
  return hogqlLineGraphInsight({
    key: 'total_accounts_created',
    name: 'Total Accounts Created',
    description: 'Cumulative external accounts created from canonical account_created events.',
    query: cumulativeFirstActorEventQuery({
      eventName: 'account_created',
      dailyAlias: 'new_accounts_created',
      totalAlias: 'total_accounts_created',
      actorAlias: 'account_id',
      actorExpression: "coalesce(nullIf(toString(properties.user_id), ''), distinct_id)",
    }),
    yAxisColumn: 'total_accounts_created',
    yAxisLabel: 'Total accounts created',
  });
}

function postsCreatedPerDayInsight() {
  return hogqlLineGraphInsight({
    key: 'posts_created_per_day',
    name: 'Posts Created Per Day',
    description: 'Daily distinct original posts created by external users.',
    query: dailyEventQuery({
      eventName: 'post_created',
      valueAlias: 'posts_created',
      aggregate: 'uniqExact(toString(properties.post_id))',
      extraConditions: [
        '  and properties.post_id is not null',
        ORIGINAL_POST_CONDITION,
      ],
    }),
    yAxisColumn: 'posts_created',
    yAxisLabel: 'Posts created',
  });
}

function postsCreatedBySourceQuery() {
  return [
    'with',
    'filtered as (',
    '  select',
    '    timestamp,',
    '    toString(properties.post_id) as post_id,',
    "    if(event = 'reddit_bot_post_created', 'reddit_bot', 'website') as post_source",
    '  from events',
    "  where event in ('post_created', 'reddit_bot_post_created')",
    EXTERNAL_ACTOR_CONDITION,
    '    and properties.post_id is not null',
    "    and (event != 'post_created' or coalesce(toString(properties.is_repost), 'false') = 'false')",
    "    and (event != 'reddit_bot_post_created' or coalesce(toString(properties.traffic_source), '') = 'redditbot')",
    '),',
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'daily as (',
    '  select',
    '    toDate(timestamp) as day,',
    "    uniqExactIf(post_id, post_source = 'reddit_bot') as reddit_bot_posts,",
    "    uniqExactIf(post_id, post_source = 'website') as website_posts,",
    '    uniqExact(post_id) as total_posts',
    '  from filtered',
    '  group by day',
    ')',
    'select',
    '  dates.day,',
    '  coalesce(daily.reddit_bot_posts, 0) as reddit_bot_posts,',
    '  coalesce(daily.website_posts, 0) as website_posts,',
    '  coalesce(daily.total_posts, 0) as total_posts',
    'from dates',
    'left join daily on daily.day = dates.day',
    'order by dates.day asc',
  ].join('\n');
}

function postsCreatedBySourceInsight() {
  return hogqlLineGraphInsight({
    key: 'posts_created_by_source',
    name: 'Posts Created by Source',
    description: 'Daily distinct Cassette posts created from the website, server-side Reddit bot, and both sources combined.',
    query: postsCreatedBySourceQuery(),
    yAxis: [
      { column: 'reddit_bot_posts', label: 'Reddit bot posts' },
      { column: 'website_posts', label: 'Website posts' },
      { column: 'total_posts', label: 'Total posts' },
    ],
  });
}

function cumulativePostsCreatedBySourceQuery() {
  return [
    'with',
    'filtered as (',
    '  select',
    '    timestamp,',
    '    toString(properties.post_id) as post_id,',
    "    if(event = 'reddit_bot_post_created', 'reddit_bot', 'website') as post_source",
    '  from events',
    "  where event in ('post_created', 'reddit_bot_post_created')",
    EXTERNAL_ACTOR_CONDITION,
    '    and properties.post_id is not null',
    "    and (event != 'post_created' or coalesce(toString(properties.is_repost), 'false') = 'false')",
    "    and (event != 'reddit_bot_post_created' or coalesce(toString(properties.traffic_source), '') = 'redditbot')",
    '),',
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'source_first_seen as (',
    '  select',
    '    post_id,',
    '    post_source,',
    '    min(toDate(timestamp)) as day',
    '  from filtered',
    '  group by post_id, post_source',
    '),',
    'total_first_seen as (',
    '  select',
    '    post_id,',
    '    min(toDate(timestamp)) as day',
    '  from filtered',
    '  group by post_id',
    '),',
    'source_daily as (',
    '  select',
    '    day,',
    "    countIf(post_source = 'reddit_bot') as new_reddit_bot_posts,",
    "    countIf(post_source = 'website') as new_website_posts",
    '  from source_first_seen',
    '  group by day',
    '),',
    'total_daily as (',
    '  select',
    '    day,',
    '    count() as new_total_posts',
    '  from total_first_seen',
    '  group by day',
    '), source_prior as (',
    '  select',
    "    countIf(post_source = 'reddit_bot') as prior_reddit_bot_posts,",
    "    countIf(post_source = 'website') as prior_website_posts",
    '  from source_first_seen, bounds',
    '  where day < bounds.start_day',
    '), total_prior as (',
    '  select',
    '    count() as prior_total_posts',
    '  from total_first_seen, bounds',
    '  where day < bounds.start_day',
    ')',
    'select',
    '  dates.day,',
    '  source_prior.prior_reddit_bot_posts + sum(coalesce(source_daily.new_reddit_bot_posts, 0)) over (order by dates.day asc rows between unbounded preceding and current row) as cumulative_reddit_bot_posts,',
    '  source_prior.prior_website_posts + sum(coalesce(source_daily.new_website_posts, 0)) over (order by dates.day asc rows between unbounded preceding and current row) as cumulative_website_posts,',
    '  total_prior.prior_total_posts + sum(coalesce(total_daily.new_total_posts, 0)) over (order by dates.day asc rows between unbounded preceding and current row) as cumulative_total_posts',
    'from dates',
    'left join source_daily on source_daily.day = dates.day',
    'left join total_daily on total_daily.day = dates.day',
    'cross join source_prior',
    'cross join total_prior',
    'order by dates.day asc',
  ].join('\n');
}

function cumulativePostsCreatedBySourceInsight() {
  return hogqlLineGraphInsight({
    key: 'cumulative_posts_created_by_source',
    name: 'Cumulative Posts Created by Source',
    description: 'Running distinct Cassette posts created from the website, server-side Reddit bot, and both sources combined.',
    query: cumulativePostsCreatedBySourceQuery(),
    yAxis: [
      { column: 'cumulative_reddit_bot_posts', label: 'Reddit bot posts' },
      { column: 'cumulative_website_posts', label: 'Website posts' },
      { column: 'cumulative_total_posts', label: 'Total posts' },
    ],
  });
}

function totalPostsCreatedInsight() {
  return hogqlLineGraphInsight({
    key: 'total_posts_created',
    name: 'Total Posts Created',
    description: 'Cumulative distinct original posts created by external users.',
    query: cumulativeEventQuery({
      eventName: 'post_created',
      dailyAlias: 'posts_created',
      totalAlias: 'total_posts_created',
      aggregate: 'uniqExact(toString(properties.post_id))',
      extraConditions: [
        '  and properties.post_id is not null',
        ORIGINAL_POST_CONDITION,
      ],
    }),
    yAxisColumn: 'total_posts_created',
    yAxisLabel: 'Total posts created',
  });
}

function conversionsMadePerDayInsight() {
  return hogqlLineGraphInsight({
    key: 'conversions_made_per_day',
    name: 'Post Platform Clicks Per Day',
    previousNames: ['Conversions Made Per Day'],
    description: 'Daily clicks on post-page platform conversion buttons by external users.',
    query: dailyEventQuery({
      eventName: 'post_platform_conversion_clicked',
      valueAlias: 'post_platform_clicks',
      aggregate: 'count()',
      extraConditions: [
        POST_SURFACE_CONDITION,
      ],
    }),
    yAxisColumn: 'post_platform_clicks',
    yAxisLabel: 'Post platform clicks',
  });
}

function totalConversionsMadeInsight() {
  return hogqlLineGraphInsight({
    key: 'total_conversions_made',
    name: 'Total Post Platform Clicks',
    previousNames: ['Total Conversions Made'],
    description: 'Cumulative clicks on post-page platform conversion buttons by external users.',
    query: cumulativeEventQuery({
      eventName: 'post_platform_conversion_clicked',
      dailyAlias: 'post_platform_clicks',
      totalAlias: 'total_post_platform_clicks',
      aggregate: 'count()',
      extraConditions: [
        POST_SURFACE_CONDITION,
      ],
    }),
    yAxisColumn: 'total_post_platform_clicks',
    yAxisLabel: 'Total post platform clicks',
  });
}

function coreActionFilteredCte({ events = productCoreActionEvents, extraConditions = [] } = {}) {
  return [
    'filtered as (',
    '  select',
    '    timestamp,',
    `    ${ACTOR_EXPRESSION} as actor_id,`,
    '    event,',
    '    properties',
    '  from events',
    `  where event in (${eventNameList(events)})`,
    EXTERNAL_ACTOR_CONDITION,
    CORE_ACTION_CONDITION,
    ...extraConditions,
    ')',
  ].join('\n');
}

function dailyCoreActionUsersQuery() {
  return [
    'with',
    `${coreActionFilteredCte()},`,
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'daily as (',
    '  select',
    '    toDate(timestamp) as day,',
    '    uniqExact(actor_id) as daily_active_core_users',
    '  from filtered',
    '  group by day',
    ')',
    'select',
    '  dates.day,',
    '  coalesce(daily.daily_active_core_users, 0) as daily_active_core_users',
    'from dates',
    'left join daily on daily.day = dates.day',
    'order by dates.day asc',
  ].join('\n');
}

function dailyCoreActionUsersInsight() {
  return hogqlLineGraphInsight({
    key: 'dau_mau_core_actions',
    name: 'Daily Active Users (Core Actions)',
    previousNames: ['DAU/MAU Users (Core Actions)'],
    description: 'Daily distinct external users who performed a successful core action.',
    query: dailyCoreActionUsersQuery(),
    yAxisColumn: 'daily_active_core_users',
    yAxisLabel: 'Daily active core users',
  });
}

function weeklyCoreActionUsersQuery() {
  return [
    'with',
    `${coreActionFilteredCte()}`,
    'select',
    '  toStartOfWeek(toDate(timestamp)) as day,',
    '  uniqExact(actor_id) as weekly_active_core_users',
    'from filtered',
    'group by day',
    'order by day asc',
  ].join('\n');
}

function weeklyCoreActionUsersInsight() {
  return hogqlLineGraphInsight({
    key: 'waa_core_actions',
    name: 'Weekly Active Accounts (Core Actions)',
    description: 'Weekly distinct external users who performed a successful core action.',
    query: weeklyCoreActionUsersQuery(),
    yAxisColumn: 'weekly_active_core_users',
    yAxisLabel: 'Weekly active core users',
  });
}

function contentCoreActionCountExpression() {
  return [
    "countIf(event = 'link_converted')",
    "+",
    "uniqExactIf(toString(properties.post_id), event = 'post_created' and properties.post_id is not null)",
  ].join(' ');
}

function contentCoreActionByElementTypeQuery(elementType) {
  return [
    'with',
    `${coreActionFilteredCte({
      events: contentCoreActionEvents,
      extraConditions: [
        `  and coalesce(toString(properties.element_type), '') = '${elementType}'`,
        "  and (event != 'post_created' or coalesce(toString(properties.is_repost), 'false') = 'false')",
      ],
    })},`,
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'daily as (',
    '  select',
    '    toDate(timestamp) as day,',
    `    ${contentCoreActionCountExpression()} as core_actions`,
    '  from filtered',
    '  group by day',
    ')',
    'select',
    '  dates.day,',
    '  coalesce(daily.core_actions, 0) as core_actions',
    'from dates',
    'left join daily on daily.day = dates.day',
    'order by dates.day asc',
  ].join('\n');
}

function contentCoreActionByElementTypeInsight(elementType) {
  const titleType = elementType[0].toUpperCase() + elementType.slice(1);

  return hogqlLineGraphInsight({
    key: `core_actions_${elementType}`,
    name: `Core Actions - ${titleType}`,
    description: `Daily successful ${elementType} content core actions from original post_created events plus legacy link_converted events.`,
    query: contentCoreActionByElementTypeQuery(elementType),
    yAxisColumn: 'core_actions',
    yAxisLabel: 'Core actions',
  });
}

function contentCoreActionElementTypeShareQuery() {
  return [
    'with',
    `${coreActionFilteredCte({
      events: contentCoreActionEvents,
      extraConditions: [
        `  and coalesce(toString(properties.element_type), '') in (${eventNameList(elementTypes)})`,
        "  and (event != 'post_created' or coalesce(toString(properties.is_repost), 'false') = 'false')",
      ],
    })},`,
    'by_type as (',
    '  select',
    "    coalesce(toString(properties.element_type), 'unknown') as element_type,",
    `    ${contentCoreActionCountExpression()} as core_actions`,
    '  from filtered',
    '  group by element_type',
    ')',
    'select',
    '  element_type,',
    '  core_actions,',
    '  if(sum(core_actions) over () = 0, 0, round(100.0 * core_actions / sum(core_actions) over (), 2)) as share_pct',
    'from by_type',
    'order by core_actions desc, element_type asc',
  ].join('\n');
}

function contentCoreActionElementTypeShareInsight() {
  return hogqlDataTableInsight({
    key: 'core_actions_element_type_share',
    name: 'Core Actions - Element Type Share (%)',
    description: 'Share of successful content core actions by element type, using original post_created events plus legacy link_converted events.',
    query: contentCoreActionElementTypeShareQuery(),
  });
}

function growthMetricInsights() {
  return [
    siteVisitorsUniqueInsight(),
    totalUniqueSiteVisitorsInsight(),
    accountsCreatedPerDayInsight(),
    totalAccountsCreatedInsight(),
    postsCreatedPerDayInsight(),
    postsCreatedBySourceInsight(),
    cumulativePostsCreatedBySourceInsight(),
    totalPostsCreatedInsight(),
    conversionsMadePerDayInsight(),
    totalConversionsMadeInsight(),
  ];
}

function redditBotCondition() {
  return "  and coalesce(toString(properties.traffic_source), '') = 'redditbot'";
}

function redditBotReferenceConditions() {
  return [
    redditBotCondition(),
    "  and coalesce(toString(properties.traffic_medium), '') = 'reddit_comment'",
  ];
}

function redditCommentPostReferralExpression() {
  return [
    "(position(toString(properties.$current_url), 'utm_source=redditbot') > 0 or position(toString(properties.$current_url), 'src=redditbot') > 0)",
    "position(toString(properties.$current_url), 'utm_medium=reddit_comment') > 0",
    "position(toString(properties.route), '/post/') = 1",
  ].join(' and ');
}

function redditCommentPostReferralCondition() {
  return `  and (${redditCommentPostReferralExpression()})`;
}

function redditSubredditExpression() {
  return "coalesce(nullIf(toString(properties.reddit_subreddit), ''), nullIf(toString(properties.traffic_content), ''), 'unknown')";
}

function redditBotVisitorsPerDayInsight() {
  return hogqlLineGraphInsight({
    key: 'reddit_bot_visitors_per_day',
    name: 'Reddit Bot Visitors Per Day',
    description: 'Daily distinct visitors whose pageview was attributed to the Reddit bot comment reference.',
    query: dailyEventQuery({
      eventName: '$pageview',
      valueAlias: 'unique_visitors',
      aggregate: `uniqExact(${ACTOR_EXPRESSION})`,
      extraConditions: redditBotReferenceConditions(),
    }),
    yAxisColumn: 'unique_visitors',
    yAxisLabel: 'Unique visitors',
  });
}

function totalRedditBotVisitorsInsight() {
  return hogqlLineGraphInsight({
    key: 'total_reddit_bot_visitors',
    name: 'Total Reddit Bot Visitors',
    description: 'Cumulative distinct visitors whose first retained pageview was attributed to the Reddit bot comment reference.',
    query: cumulativeFirstActorEventQuery({
      eventName: '$pageview',
      dailyAlias: 'new_reddit_bot_visitors',
      totalAlias: 'total_reddit_bot_visitors',
      actorAlias: 'visitor_id',
      extraConditions: redditBotReferenceConditions(),
    }),
    yAxisColumn: 'total_reddit_bot_visitors',
    yAxisLabel: 'Total Reddit bot visitors',
  });
}

function redditBotSignupToWebsitePostFunnelInsight() {
  return {
    key: 'reddit_bot_signup_to_website_post_funnel',
    name: 'Reddit Bot Signup to Website Post Funnel',
    description: 'Reddit bot comment visitor flow: attributed pageview -> account_created -> original website post_created.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: '$pageview',
            name: 'Reddit bot comment pageview',
            properties: [
              internalActorPropertyFilter(false),
              {
                key: 'traffic_source',
                value: 'redditbot',
                operator: 'exact',
                type: 'event',
              },
              {
                key: 'traffic_medium',
                value: 'reddit_comment',
                operator: 'exact',
                type: 'event',
              },
            ],
          },
          {
            kind: 'EventsNode',
            event: 'account_created',
            name: 'account_created',
            properties: [
              internalActorPropertyFilter(false),
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_created',
            name: 'website post_created',
            properties: [
              internalActorPropertyFilter(false),
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

function redditBotVisitorToPlatformClickFunnelInsight() {
  return {
    key: 'reddit_bot_visitor_to_platform_click_funnel',
    name: 'Reddit Bot Visitor to Platform Click Funnel',
    description: 'Reddit bot comment visitor flow: attributed pageview -> post-page platform conversion click.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: '$pageview',
            name: 'Reddit bot comment pageview',
            properties: [
              internalActorPropertyFilter(false),
              {
                key: 'traffic_source',
                value: 'redditbot',
                operator: 'exact',
                type: 'event',
              },
              {
                key: 'traffic_medium',
                value: 'reddit_comment',
                operator: 'exact',
                type: 'event',
              },
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_platform_conversion_clicked',
            name: 'post_platform_conversion_clicked',
            properties: [
              internalActorPropertyFilter(false),
              {
                key: 'source_surface',
                value: 'post',
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

function redditBotPlaylistSaveFunnelInsight() {
  return {
    key: 'reddit_bot_playlist_save_funnel',
    name: 'Reddit Bot Playlist Save Funnel',
    description: 'Reddit bot comment visitor flow: attributed pageview -> playlist convert click -> playlist_created_on_platform.',
    query: {
      kind: 'InsightVizNode',
      source: {
        kind: 'FunnelsQuery',
        series: [
          {
            kind: 'EventsNode',
            event: '$pageview',
            name: 'Reddit bot comment pageview',
            properties: [
              internalActorPropertyFilter(false),
              {
                key: 'traffic_source',
                value: 'redditbot',
                operator: 'exact',
                type: 'event',
              },
              {
                key: 'traffic_medium',
                value: 'reddit_comment',
                operator: 'exact',
                type: 'event',
              },
            ],
          },
          {
            kind: 'EventsNode',
            event: 'post_platform_conversion_clicked',
            name: 'playlist_convert_button',
            properties: [
              internalActorPropertyFilter(false),
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
              internalActorPropertyFilter(false),
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

function redditBotPostsCreatedQuery() {
  return [
    'with',
    'filtered as (',
    '  select',
    '    timestamp,',
    '    toString(properties.post_id) as post_id',
    '  from events',
    "  where event = 'reddit_bot_post_created'",
    EXTERNAL_ACTOR_CONDITION,
    '    and properties.post_id is not null',
    redditBotCondition(),
    '),',
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'daily as (',
    '  select',
    '    toDate(timestamp) as day,',
    '    uniqExact(post_id) as posts_created',
    '  from filtered',
    '  group by day',
    ')',
    'select',
    '  dates.day,',
    '  coalesce(daily.posts_created, 0) as posts_created',
    'from dates',
    'left join daily on daily.day = dates.day',
    'order by dates.day asc',
  ].join('\n');
}

function redditBotLinkEngagementQuery() {
  return [
    'with',
    'filtered as (',
    '  select',
    '    timestamp,',
    '    person_id,',
    '    distinct_id,',
    '    properties',
    '  from events',
    "  where event = '$pageview'",
    '    and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    redditBotCondition(),
    redditCommentPostReferralCondition(),
    '),',
    `${dateSeriesCtes('filtered', 'toDate(timestamp)')},`,
    'daily as (',
    '  select',
    '    toDate(timestamp) as day,',
    '    count() as reddit_comment_post_referrals,',
    `    uniqExact(${ACTOR_EXPRESSION}) as unique_visitors`,
    '  from filtered',
    '  group by day',
    ')',
    'select',
    '  dates.day,',
    '  coalesce(daily.reddit_comment_post_referrals, 0) as reddit_comment_post_referrals,',
    '  coalesce(daily.unique_visitors, 0) as unique_visitors',
    'from dates',
    'left join daily on daily.day = dates.day',
    'order by dates.day asc',
  ].join('\n');
}

function redditBotLinkOpensBySubredditQuery() {
  return [
    'select',
    `  ${redditSubredditExpression()} as comment_subreddit,`,
    '  count() as direct_comment_post_referrals,',
    `  uniqExact(${ACTOR_EXPRESSION}) as unique_direct_visitors`,
    'from events',
    "  where event = '$pageview'",
    '  and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    redditBotCondition(),
    redditCommentPostReferralCondition(),
    'group by comment_subreddit',
    'order by direct_comment_post_referrals desc, unique_direct_visitors desc, comment_subreddit asc',
    'limit 50',
  ].join('\n');
}

function redditBotPostsCreatedBySubredditQuery() {
  return [
    'select',
    `  ${redditSubredditExpression()} as source_subreddit,`,
    '  uniqExact(toString(properties.post_id)) as bot_posts_created',
    'from events',
    "  where event = 'reddit_bot_post_created'",
    '  and timestamp >= now() - INTERVAL 90 DAY',
    EXTERNAL_ACTOR_CONDITION,
    redditBotCondition(),
    '  and properties.post_id is not null',
    'group by source_subreddit',
    'order by bot_posts_created desc, source_subreddit asc',
    'limit 50',
  ].join('\n');
}

function redditBotDownstreamBySubredditQuery() {
  return [
    'select',
    `  ${redditSubredditExpression()} as reddit_subreddit,`,
    "  countIf(event = 'post_platform_conversion_clicked') as convert_to_platform_clicks,",
    "  countIf(event in ('streaming_link_opened', 'playlist_opened_on_platform')) as streaming_platform_opens,",
    "  countIf(event = 'playlist_created_on_platform') as playlists_created_on_platform",
    'from events',
    "where event in ('post_platform_conversion_clicked', 'streaming_link_opened', 'playlist_opened_on_platform', 'playlist_created_on_platform')",
    EXTERNAL_ACTOR_CONDITION,
    redditBotCondition(),
    'group by reddit_subreddit',
    'order by convert_to_platform_clicks desc, streaming_platform_opens desc, playlists_created_on_platform desc',
    'limit 50',
  ].join('\n');
}

function redditBotAttributionInsights() {
  return [
    redditBotVisitorsPerDayInsight(),
    totalRedditBotVisitorsInsight(),
    redditBotSignupToWebsitePostFunnelInsight(),
    redditBotVisitorToPlatformClickFunnelInsight(),
    redditBotPlaylistSaveFunnelInsight(),
    hogqlLineGraphInsight({
      key: 'reddit_bot_posts_created',
      name: 'Reddit Bot Cassette Posts Created',
      description: 'Cassette playlist posts created by the Reddit bot, counted from server-side reddit_bot_post_created events.',
      query: redditBotPostsCreatedQuery(),
      yAxisColumn: 'posts_created',
      yAxisLabel: 'Posts created',
    }),
    hogqlLineGraphInsight({
      key: 'reddit_bot_link_engagement',
      name: 'Reddit Comment Post Referrals',
      previousNames: ['Reddit Bot Link Engagement', 'Reddit Bot Traffic and Engagement'],
      description: 'Direct arrivals from Reddit comments to Cassette post pages, counted from current URLs with redditbot source and reddit_comment medium.',
      query: redditBotLinkEngagementQuery(),
      yAxis: [
        { column: 'reddit_comment_post_referrals', label: 'Reddit comment post referrals' },
        { column: 'unique_visitors', label: 'Unique visitors' },
      ],
    }),
    hogqlDataTableInsight({
      key: 'reddit_bot_link_opens_by_subreddit',
      name: 'Reddit Comment Direct Referrals by Comment Subreddit',
      previousNames: [
        'Reddit Comment Referrals and Bot Posts by Subreddit',
        'Reddit Bot Link Opens by Subreddit',
        'Reddit Comment Post Referrals by Subreddit',
      ],
      description: 'Direct arrivals from Reddit comments to Cassette post pages, split by the subreddit where the Reddit comment link was posted.',
      query: redditBotLinkOpensBySubredditQuery(),
    }),
    hogqlDataTableInsight({
      key: 'reddit_bot_posts_created_by_subreddit',
      name: 'Reddit Bot Posts Created by Source Subreddit',
      description: 'Distinct Cassette posts created by the Reddit bot, split by the subreddit that supplied the source playlist.',
      query: redditBotPostsCreatedBySubredditQuery(),
    }),
    hogqlDataTableInsight({
      key: 'reddit_bot_downstream_by_subreddit',
      name: 'Reddit-Attributed Downstream Actions by Subreddit',
      previousNames: ['Reddit Bot Downstream Actions by Subreddit'],
      description: 'Reddit-attributed convert-to-platform clicks, streaming platform opens, and playlists created on platform split by subreddit.',
      query: redditBotDownstreamBySubredditQuery(),
    }),
  ];
}

function dashboardLayout(x, y, w, h) {
  return {
    sm: {
      x,
      y,
      w,
      h,
      minW: 1,
      minH: 1,
    },
  };
}

function dashboardLayoutByRows(rows) {
  const layouts = new Map();
  let y = 0;

  for (const row of rows) {
    let x = 0;
    const rowHeight = Math.max(...row.map((tile) => tile.h || 5));

    for (const tile of row) {
      const width = tile.w || 6;
      layouts.set(tile.key, dashboardLayout(x, y, width, tile.h || rowHeight));
      x += width;
    }

    y += rowHeight;
  }

  return layouts;
}

function productDashboardLayoutByKey() {
  return dashboardLayoutByRows([
    [
      { key: 'site_visitors_unique', w: 4, h: 4 },
      { key: 'accounts_created_per_day', w: 4, h: 4 },
      { key: 'posts_created_by_source', w: 4, h: 4 },
    ],
    [
      { key: 'total_unique_site_visitors', w: 4, h: 4 },
      { key: 'total_accounts_created', w: 4, h: 4 },
      { key: 'cumulative_posts_created_by_source', w: 4, h: 4 },
    ],
    [
      { key: 'total_posts_created', w: 4, h: 4 },
      { key: 'conversions_made_per_day', w: 4, h: 4 },
      { key: 'total_conversions_made', w: 4, h: 4 },
    ],
    [
      { key: 'creator_intent_activation', w: 6, h: 5 },
      { key: 'conversion_funnel', w: 6, h: 5 },
    ],
    [
      { key: 'account_to_website_post_funnel', w: 6, h: 5 },
      { key: 'post_engagement_funnel', w: 6, h: 5 },
    ],
    [
      { key: 'content_engagement_quality', w: 6, h: 6 },
      { key: 'post_distribution_3plus_viewers_7d', w: 6, h: 5 },
    ],
    [
      { key: 'dau_mau_core_actions', w: 6 },
      { key: 'waa_core_actions', w: 6 },
    ],
    [
      { key: 'reddit_bot_visitors_per_day', w: 6, h: 4 },
      { key: 'reddit_bot_posts_created', w: 6, h: 4 },
    ],
    [
      { key: 'playlist_creation_outcomes', w: 6, h: 6 },
      { key: 'failure_monitor', w: 6, h: 6 },
    ],
  ]);
}

function productActivationDashboardLayoutByKey() {
  return dashboardLayoutByRows([
    [
      { key: 'onboarding_activation', w: 12, h: 5 },
    ],
    [
      { key: 'post_viewer_signup_to_website_post_funnel', w: 12, h: 5 },
    ],
    [
      { key: 'viewer_to_contributor', w: 6, h: 5 },
      { key: 'creator_repeat_after_distribution', w: 6, h: 5 },
    ],
    [
      { key: 'search_intent_to_post_funnel', w: 6, h: 5 },
      { key: 'reddit_bot_signup_to_website_post_funnel', w: 6, h: 5 },
    ],
    [
      { key: 'reddit_bot_visitor_to_platform_click_funnel', w: 6, h: 5 },
      { key: 'reddit_bot_playlist_save_funnel', w: 6, h: 5 },
    ],
  ]);
}

function productAcquisitionDashboardLayoutByKey() {
  return dashboardLayoutByRows([
    [
      { key: 'posts_created_per_day', w: 6, h: 4 },
      { key: 'total_reddit_bot_visitors', w: 6, h: 4 },
    ],
    [
      { key: 'signup_attribution_mix', w: 6, h: 6 },
      { key: 'search_intent_quality', w: 6, h: 6 },
    ],
    [
      { key: 'reddit_bot_link_engagement', w: 6, h: 4 },
      { key: 'reddit_subreddit_business_quality', w: 6, h: 6 },
    ],
    [
      { key: 'reddit_bot_link_opens_by_subreddit', w: 6, h: 6 },
      { key: 'reddit_bot_posts_created_by_subreddit', w: 6, h: 6 },
    ],
    [
      { key: 'reddit_bot_downstream_by_subreddit', w: 6, h: 6 },
      { key: 'post_distribution_ladder', w: 6, h: 5 },
    ],
  ]);
}

function productDiagnosticsDashboardLayoutByKey() {
  return dashboardLayoutByRows([
    [
      { key: 'platform_demand_matrix', w: 6, h: 6 },
      { key: 'playlist_conversion_friction', w: 6, h: 6 },
    ],
    [
      { key: 'signed_out_conversion_intent', w: 6, h: 6 },
      { key: 'platform_preference_stickiness', w: 6, h: 6 },
    ],
    [
      { key: 'creator_stickiness', w: 6, h: 5 },
      { key: 'viewer_return_quality', w: 6, h: 5 },
    ],
    [
      { key: 'page_engagement_quality', w: 6, h: 6 },
      { key: 'unsupported_link_demand', w: 6, h: 6 },
    ],
    [
      { key: 'issue_report_hotspots', w: 6, h: 6 },
      { key: 'post_platform_cta_users_unique', w: 6, h: 4 },
    ],
    [
      { key: 'post_platform_cta_by_target_platform', w: 6, h: 4 },
      { key: 'post_platform_cta_by_element_type', w: 6, h: 4 },
    ],
    [
      { key: 'core_actions_element_type_share', w: 6, h: 6 },
      { key: 'platform_source_mix', w: 6, h: 5 },
    ],
    [
      { key: 'core_actions_playlist', w: 3, h: 4 },
      { key: 'core_actions_track', w: 3, h: 4 },
      { key: 'core_actions_album', w: 3, h: 4 },
      { key: 'core_actions_artist', w: 3, h: 4 },
    ],
  ]);
}

function productInsightDefinitionCatalog() {
  return [
    ...growthMetricInsights(),
    ...withInternalActorFilter(insightDefinitions, false),
    ...redditBotAttributionInsights(),
    postDistributionMetricInsight({ internalActor: false }),
    postDistributionLadderInsight({ internalActor: false }),
    creatorRepeatAfterDistributionInsight({ internalActor: false }),
    viewerToContributorInsight({ internalActor: false }),
    playlistCreationOutcomesInsight({ internalActor: false }),
  ];
}

function dashboardInsightDefinitions(layoutsByKey) {
  const definitionsByKey = new Map(
    productInsightDefinitionCatalog().map((definition) => [definition.key, definition]),
  );

  return [...layoutsByKey.entries()].map(([key, layout]) => {
    const definition = definitionsByKey.get(key);
    if (!definition) {
      throw new Error(`Missing product dashboard insight definition for key "${key}".`);
    }

    return {
      ...definition,
      dashboardLayout: layout,
    };
  });
}

function productDashboardInsightDefinitions() {
  return dashboardInsightDefinitions(productDashboardLayoutByKey());
}

function productActivationDashboardInsightDefinitions() {
  return dashboardInsightDefinitions(productActivationDashboardLayoutByKey());
}

function productAcquisitionDashboardInsightDefinitions() {
  return dashboardInsightDefinitions(productAcquisitionDashboardLayoutByKey());
}

function productDiagnosticsDashboardInsightDefinitions() {
  return dashboardInsightDefinitions(productDiagnosticsDashboardLayoutByKey());
}

const insightDefinitions = [
  weeklyCoreActionUsersInsight(),
  dailyCoreActionUsersInsight(),
  contentCoreActionByElementTypeInsight('track'),
  contentCoreActionByElementTypeInsight('album'),
  contentCoreActionByElementTypeInsight('artist'),
  contentCoreActionByElementTypeInsight('playlist'),
  contentCoreActionElementTypeShareInsight(),
  contentEngagementQualityInsight(),
  platformDemandMatrixInsight(),
  playlistConversionFrictionInsight(),
  signedOutConversionIntentInsight(),
  signupAttributionMixInsight(),
  creatorStickinessInsight(),
  viewerReturnQualityInsight(),
  platformPreferenceStickinessInsight(),
  redditSubredditBusinessQualityInsight(),
  searchIntentQualityInsight(),
  searchIntentToPostFunnelInsight(),
  unsupportedLinkDemandInsight(),
  pageEngagementQualityInsight(),
  issueReportHotspotsInsight(),
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
        {
          id: 'post_created',
          type: 'events',
          order: 2,
          name: 'website post_created',
          properties: [
            {
              key: 'is_repost',
              value: 'false',
              operator: 'exact',
              type: 'event',
            },
          ],
        },
      ],
    },
  },
  postViewerConversionFunnelInsight({ internalActor: false }),
  accountToWebsitePostFunnelInsight({ internalActor: false }),
  postViewerSignupToWebsitePostFunnelInsight({ internalActor: false }),
  {
    key: 'post_engagement_funnel',
    name: 'Playlist Save Funnel',
    previousNames: ['Post Engagement Funnel'],
    description: 'Playlist conversion flow: post_viewed -> playlist convert CTA click -> playlist_created_on_platform.',
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
    name: 'Post Platform CTA by Content Type',
    previousNames: ['Post Platform CTA by Element Type'],
    description: 'Post-page destination CTA clicks split by actual content type: track, album, artist, and playlist.',
    filters: {
      insight: 'TRENDS',
      interval: 'day',
      display: 'ActionsBar',
      events: elementTypes.map((elementType) => postPlatformConversionEvent({
        name: `post_platform_conversion_clicked (${elementType})`,
        elementType,
      })),
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
  onboardingActivationFunnelInsight({ internalActor: false }),
  creatorIntentActivationFunnelInsight({ internalActor: false }),
];

const dashboardName = 'Cassette Product Analytics';
const productActivationDashboardName = 'Cassette Product Analytics: Activation & Funnels';
const productAcquisitionDashboardName = 'Cassette Product Analytics: Acquisition & Distribution';
const productDiagnosticsDashboardName = 'Cassette Product Analytics: Diagnostics';
const internalDashboardName = 'Cassette Internal Activity';
const deprecatedInsightNames = [
  'Core Actions by Element Type',
  'Internal Core Actions by Element Type',
  'Link Conversion Funnel',
  'Post Platform CTA Clicks (Total)',
  'Reddit Bot Link Engagement',
  'Reddit Bot Link Opens by Subreddit',
  'Reddit Bot Traffic and Engagement',
  'DAU/MAU Users (Core Actions)',
  'Reddit Comment Post Referrals by Subreddit',
];

const productInsightDefinitions = productDashboardInsightDefinitions();
const productActivationInsightDefinitions = productActivationDashboardInsightDefinitions();
const productAcquisitionInsightDefinitions = productAcquisitionDashboardInsightDefinitions();
const productDiagnosticsInsightDefinitions = productDiagnosticsDashboardInsightDefinitions();

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
  const items = [];
  let nextPath = `${path}${path.includes('?') ? '&' : '?'}limit=200`;

  while (nextPath) {
    const data = await api(nextPath);
    if (!data) break;

    if (Array.isArray(data.results)) {
      items.push(...data.results);
    } else if (Array.isArray(data)) {
      items.push(...data);
      break;
    } else {
      break;
    }

    if (!data.next) {
      break;
    }

    nextPath = data.next.startsWith('http')
      ? `${new URL(data.next).pathname}${new URL(data.next).search}`
      : data.next;
  }

  return items;
}

async function upsertInsight(definition, dashboardId) {
  const insights = await listAll(`${scopePath}/insights/`);
  const candidateNames = [
    definition.name,
    ...(Array.isArray(definition.previousNames) ? definition.previousNames : []),
  ];
  const namedMatches = insights.filter((insight) => candidateNames.includes(insight.name));

  if (namedMatches.length > 1) {
    const ids = namedMatches.map((insight) => insight.id).filter(Boolean).join(', ');
    console.warn(`Multiple insights named "${definition.name}" found (${ids || 'unknown ids'}).`);
  }

  let existing = namedMatches.find((insight) => insight.name === definition.name) || namedMatches[0];
  if (dashboardId && namedMatches.length > 1) {
    const attached = namedMatches.find((insight) => Array.isArray(insight.dashboards)
      && insight.dashboards.includes(dashboardId));
    if (attached) {
      existing = attached;
    }
  }

  const usesLegacyFilters = definition.filters && !definition.query;
  if (usesLegacyFilters && existing) {
    const currentDashboards = Array.isArray(existing.dashboards) ? existing.dashboards : [];
    const isAttached = dashboardId && currentDashboards.includes(dashboardId);

    console.log(`Using existing legacy insight: ${definition.name} (${existing.id})`);
    if (!dryRun && dashboardId && !isAttached) {
      return await api(`${scopePath}/insights/${existing.id}/`, {
        method: 'PATCH',
        body: {
          dashboards: [...currentDashboards, dashboardId],
        },
      });
    }

    return existing;
  }

  if (usesLegacyFilters && dryRun) {
    console.log(`Would use existing legacy insight: ${definition.name}`);
    return { id: `${definition.key}-legacy-existing`, name: definition.name };
  }

  if (usesLegacyFilters && !existing) {
    throw new Error(`Cannot create legacy-filter insight "${definition.name}" with this PostHog API key.`);
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

function getTileInsightId(tile) {
  if (!tile?.insight) return null;
  if (typeof tile.insight === 'object') return tile.insight.id ?? null;
  return tile.insight;
}

async function readDashboardTiles(dashboardId) {
  const dashboard = await api(`${scopePath}/dashboards/${dashboardId}/`);
  return Array.isArray(dashboard.tiles) ? dashboard.tiles : [];
}

async function readDashboardTilesAfterInsightAttachment(dashboardId, expectedInsightIds) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const tiles = await readDashboardTiles(dashboardId);
    const tileInsightIds = new Set(tiles.map(getTileInsightId).filter(Boolean).map(String));
    const missing = expectedInsightIds.filter((insightId) => !tileInsightIds.has(String(insightId)));

    if (missing.length === 0) {
      return tiles;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return await readDashboardTiles(dashboardId);
}

async function applyDashboardLayout(dashboardId, provisionedInsights) {
  const layoutTargets = provisionedInsights
    .filter(({ definition, insight }) => definition.dashboardLayout && insight?.id)
    .map(({ definition, insight }, index) => ({
      definition,
      insightId: insight.id,
      order: index,
    }));

  if (layoutTargets.length === 0) {
    return;
  }

  if (dryRun) {
    console.log(`Would apply dashboard layout to ${layoutTargets.length} tiles on dashboard ${dashboardId}`);
    return;
  }

  const tiles = await readDashboardTilesAfterInsightAttachment(
    dashboardId,
    layoutTargets.map(({ insightId }) => insightId),
  );
  const tileByInsightId = new Map(
    tiles
      .map((tile) => [getTileInsightId(tile), tile])
      .filter(([insightId]) => insightId)
      .map(([insightId, tile]) => [String(insightId), tile]),
  );
  const missing = [];
  const orderedTiles = [];

  for (const target of layoutTargets) {
    const tile = tileByInsightId.get(String(target.insightId));
    if (!tile) {
      missing.push(target.definition.name);
      continue;
    }

    orderedTiles.push({
      ...tile,
      order: target.order,
      layouts: target.definition.dashboardLayout,
      show_description: false,
    });
  }

  if (missing.length > 0) {
    throw new Error(`Unable to apply dashboard layout; missing tile(s): ${missing.join(', ')}`);
  }

  await api(`${scopePath}/dashboards/${dashboardId}/`, {
    method: 'PATCH',
    body: { tiles: orderedTiles },
  });

  console.log(`Applied dashboard layout to ${orderedTiles.length} tiles.`);
}

function productDashboardDescription() {
  return [
    'Auto-provisioned executive overview for Cassette product analytics (external actors only).',
    'Detailed funnels, acquisition breakdowns, and diagnostic tables are provisioned to secondary Product Analytics dashboards.',
  ].join(' ');
}

function defaultProductDashboardDescription() {
  return 'Auto-provisioned dashboard for Cassette product analytics (external actors only).';
}

function productActivationDashboardDescription() {
  return 'Auto-provisioned dashboard for detailed Cassette activation, conversion, and funnel analysis (external actors only).';
}

function productAcquisitionDashboardDescription() {
  return 'Auto-provisioned dashboard for Cassette acquisition, Reddit distribution, search intent, and post distribution detail (external actors only).';
}

function productDiagnosticsDashboardDescription() {
  return 'Auto-provisioned dashboard for Cassette demand, friction, retention, and failure diagnostics (external actors only).';
}

function internalDashboardDescription() {
  return 'Auto-provisioned dashboard for Cassette internal team and operational attribution analytics.';
}

function shouldApplyDashboardLayout(dashboardSpec) {
  return dashboardSpec.applyLayout === true && !pmfOnly && !growthOnly && !playlistConversionsOnly && !postsCreatedOnly && !redditBotOnly;
}

async function upsertDashboardInsights(dashboardSpec, dashboardId) {
  const provisionedInsights = [];

  for (const definition of dashboardSpec.insights) {
    const insight = await upsertInsight(definition, dashboardId);
    provisionedInsights.push({ definition, insight });
  }

  if (shouldApplyDashboardLayout(dashboardSpec)) {
    await applyDashboardLayout(dashboardId, provisionedInsights);
  }

  return provisionedInsights.length;
}

async function main() {
  const modeLabel = redditBotOnly
    ? 'reddit-bot-only'
    : playlistConversionsOnly
      ? 'playlist-conversions-only'
      : postsCreatedOnly
        ? 'posts-created-only'
        : growthOnly
          ? 'growth-only'
          : pmfOnly
            ? 'pmf-only'
            : 'full';
  console.log(`PostHog provisioning started (${dryRun ? 'dry-run' : 'apply'}, ${modeLabel})`);
  console.log(`Host: ${host}`);
  console.log(`Scope: ${scopePath}`);

  const dashboardSpecs = redditBotOnly
    ? [
      {
        name: dashboardName,
        description: defaultProductDashboardDescription(),
        insights: redditBotAttributionInsights(),
      },
    ]
    : playlistConversionsOnly
    ? [
      {
        name: dashboardName,
        description: defaultProductDashboardDescription(),
        insights: [
          playlistCreationFunnelInsight({ internalActor: false }),
          playlistCreationOutcomesInsight({ internalActor: false }),
        ],
      },
    ]
    : postsCreatedOnly
    ? [
      {
        name: dashboardName,
        description: defaultProductDashboardDescription(),
        insights: [
          postsCreatedBySourceInsight(),
          cumulativePostsCreatedBySourceInsight(),
        ],
      },
    ]
    : growthOnly
    ? [
      {
        name: dashboardName,
        description: defaultProductDashboardDescription(),
        insights: growthMetricInsights(),
      },
    ]
    : [
      {
        name: dashboardName,
        description: pmfOnly ? defaultProductDashboardDescription() : productDashboardDescription(),
        insights: pmfOnly ? pmfProductInsightDefinitions : productInsightDefinitions,
        applyLayout: !pmfOnly,
      },
      ...(!pmfOnly
        ? [
          {
            name: productActivationDashboardName,
            description: productActivationDashboardDescription(),
            insights: productActivationInsightDefinitions,
            applyLayout: true,
          },
          {
            name: productAcquisitionDashboardName,
            description: productAcquisitionDashboardDescription(),
            insights: productAcquisitionInsightDefinitions,
            applyLayout: true,
          },
          {
            name: productDiagnosticsDashboardName,
            description: productDiagnosticsDashboardDescription(),
            insights: productDiagnosticsInsightDefinitions,
            applyLayout: true,
          },
        ]
        : []),
      {
        name: internalDashboardName,
        description: internalDashboardDescription(),
        insights: pmfOnly ? pmfInternalInsightDefinitions : internalInsightDefinitions,
      },
    ];

  let totalInsights = 0;
  for (const dashboardSpec of dashboardSpecs) {
    const dashboard = await upsertDashboard(dashboardSpec.name, dashboardSpec.description);
    totalInsights += await upsertDashboardInsights(dashboardSpec, dashboard.id);
  }

  if (!pmfOnly && !growthOnly && !playlistConversionsOnly && !postsCreatedOnly && !redditBotOnly) {
    await detachDeprecatedInsights();
  }

  console.log('Provisioning complete.');
  console.log(`Dashboards provisioned: ${dashboardSpecs.length}`);
  console.log(`Insights provisioned: ${totalInsights}`);
  console.log(`Dashboards: ${dashboardSpecs.map((dashboardSpec) => dashboardSpec.name).join(', ')}`);
  console.log('Insights linked to dashboards via insight.dashboards.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
