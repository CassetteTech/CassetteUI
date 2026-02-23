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
    description: 'post_viewed -> streaming_link_opened -> playlist_created_on_platform.',
    filters: {
      insight: 'FUNNELS',
      layout: 'horizontal',
      events: [
        { id: 'post_viewed', type: 'events', order: 0, name: 'post_viewed' },
        { id: 'streaming_link_opened', type: 'events', order: 1, name: 'streaming_link_opened' },
        { id: 'playlist_created_on_platform', type: 'events', order: 2, name: 'playlist_created_on_platform' },
      ],
    },
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
];

const dashboardName = 'Cassette Product Analytics';
const internalDashboardName = 'Cassette Internal Activity';
const deprecatedInsightNames = [
  'Core Actions by Element Type',
  'Internal Core Actions by Element Type',
];

const productInsightDefinitions = withInternalActorFilter(insightDefinitions, false);

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
      events: elementTypes.map((elementType) => postPlatformConversionEvent({
        name: `post_platform_conversion_clicked (${elementType})`,
        elementType,
      })),
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
  const existing = insights.find((insight) => insight.name === definition.name);

  const payload = {
    name: definition.name,
    description: definition.description,
    derived_name: definition.name,
    filters: definition.filters,
    dashboards: dashboardId ? [dashboardId] : [],
  };

  if (existing) {
    console.log(`Updating insight: ${definition.name}`);
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
  console.log(`PostHog provisioning started (${dryRun ? 'dry-run' : 'apply'})`);
  console.log(`Host: ${host}`);
  console.log(`Scope: ${scopePath}`);

  const dashboardSpecs = [
    {
      name: dashboardName,
      description: 'Auto-provisioned dashboard for Cassette product analytics (external actors only).',
      insights: productInsightDefinitions,
    },
    {
      name: internalDashboardName,
      description: 'Auto-provisioned dashboard for Cassette internal team analytics (CassetteTeam actors).',
      insights: internalInsightDefinitions,
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

  await detachDeprecatedInsights();

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
