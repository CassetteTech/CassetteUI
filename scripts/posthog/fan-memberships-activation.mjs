// Defines the "Fan Memberships: Activation (production)" dashboard: curator and fan
// activation metrics as SQL insights over production events since the release.

export const FAN_MEMBERSHIPS_DASHBOARD_NAME = 'Fan Memberships: Activation (production)';
export const TEST_ACCOUNTS_COHORT_NAME = 'Cassette test accounts';

const UI_PRODUCTION = "properties.$host IN ('cassette.tech', 'www.cassette.tech')";
const BRIDGE_PRODUCTION = "properties.environment = 'production'";
const EXTERNAL_ACTOR = 'coalesce(toBool(properties.internal_actor), false) = false';
const NOT_TEST_ACCOUNT = `person_id NOT IN COHORT '${TEST_ACCOUNTS_COHORT_NAME}'`;
const HAS_POST = "coalesce(toString(properties.post_id), '') != ''";
// Unmatched LEFT JOIN columns can be NULL or the type default (empty string,
// 1970-01-01), so matches test a non-empty key, which is false in both cases.

// Accepts an ISO date-time and returns the HogQL literal form, so no caller text reaches a query.
export function releaseTimestamp(value) {
  const parsed = new Date(value ?? '');
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new Error('Fan Memberships dashboard needs --release-utc=<ISO date-time>, for example 2026-10-20T00:00:00Z.');
  }
  return parsed.toISOString().slice(0, 19).replace('T', ' ');
}

function sinceRelease(release) {
  return `timestamp >= toDateTime('${release}')`;
}

function signupsCte(release, maturedBefore) {
  return `signups AS (
    SELECT distinct_id AS user_id, min(timestamp) AS signed_up_at
    FROM events
    WHERE event = 'account_created'
      AND ${BRIDGE_PRODUCTION}
      AND ${EXTERNAL_ACTOR}
      AND ${NOT_TEST_ACCOUNT}
      AND ${sinceRelease(release)}${maturedBefore ? `\n      AND timestamp < ${maturedBefore}` : ''}
    GROUP BY user_id
),
membership_signups AS (
    SELECT DISTINCT distinct_id AS user_id
    FROM events
    WHERE event IN ('onboarding_started', 'onboarding_completed')
      AND properties.onboarding_variant = 'membership'
      AND ${sinceRelease(release)}
)`;
}

function automatedCte(release) {
  return `automated AS (
    SELECT person_id
    FROM events
    WHERE event = 'post_viewed' AND ${sinceRelease(release)}
    GROUP BY person_id, toDate(timestamp)
    HAVING count() > 200
)`;
}

function firstMembersCte() {
  return `first_members AS (
    SELECT toString(properties.curator_user_id) AS user_id, min(timestamp) AS first_member_at
    FROM events
    WHERE event = 'membership_started'
      AND ${BRIDGE_PRODUCTION}
      AND ${EXTERNAL_ACTOR}
      AND ${NOT_TEST_ACCOUNT}
      AND properties.curator_user_id IS NOT NULL
    GROUP BY user_id
)`;
}

// A trend adds its period column to the final SELECT and groups by it.
function trendParts(period) {
  return period
    ? { select: `${period} AS period,\n    `, group: '\nGROUP BY period\nORDER BY period' }
    : { select: '', group: '' };
}

export function curatorFirstPostQuery(release, period) {
  const trend = trendParts(period);
  return `WITH ${signupsCte(release, 'now() - INTERVAL 1 DAY')},
first_posts AS (
    SELECT distinct_id AS user_id, min(timestamp) AS first_post_at
    FROM events
    WHERE event = 'post_created'
      AND coalesce(toBool(properties.is_repost), false) = false
      AND (${UI_PRODUCTION} OR ${BRIDGE_PRODUCTION})
      AND ${sinceRelease(release)}
    GROUP BY user_id
)
SELECT
    ${trend.select}count() AS curator_signups,
    countIf(p.first_post_at >= s.signed_up_at
            AND p.first_post_at <= s.signed_up_at + INTERVAL 10 MINUTE) AS first_post_within_10_min,
    round(100 * first_post_within_10_min / curator_signups, 1) AS rate_pct,
    quantileIf(0.5)(dateDiff('minute', s.signed_up_at, p.first_post_at),
                    p.first_post_at >= s.signed_up_at
                    AND p.first_post_at <= s.signed_up_at + INTERVAL 1 DAY) AS median_minutes_to_first_post
FROM signups AS s
LEFT JOIN first_posts AS p ON p.user_id = s.user_id
WHERE s.user_id NOT IN (SELECT user_id FROM membership_signups)${trend.group}`;
}

export function curatorOpensQuery(release, period) {
  const trend = trendParts(period);
  return `WITH ${signupsCte(release, 'now() - INTERVAL 7 DAY')},
curator_posts AS (
    SELECT toString(properties.post_id) AS post_id, any(distinct_id) AS owner_id
    FROM events
    WHERE event = 'post_created'
      AND coalesce(toBool(properties.is_repost), false) = false
      AND ${HAS_POST}
      AND ${sinceRelease(release)}
    GROUP BY post_id
),
opens AS (
    SELECT toString(properties.post_id) AS post_id,
           timestamp,
           coalesce(nullIf(toString(properties.user_id), ''), distinct_id) AS opener_id
    FROM events
    WHERE event IN ('streaming_link_opened', 'playlist_opened_on_platform')
      AND ${UI_PRODUCTION}
      AND ${HAS_POST}
      AND ${EXTERNAL_ACTOR}
      AND ${NOT_TEST_ACCOUNT}
      AND ${sinceRelease(release)}
),
per_curator AS (
    SELECT s.user_id AS user_id,
           s.signed_up_at AS signed_up_at,
           countIf(o.timestamp >= s.signed_up_at
                   AND o.timestamp <= s.signed_up_at + INTERVAL 7 DAY
                   AND o.opener_id != s.user_id) AS opens_7d
    FROM signups AS s
    LEFT JOIN curator_posts AS cp ON cp.owner_id = s.user_id
    LEFT JOIN opens AS o ON o.post_id = cp.post_id
    WHERE s.user_id NOT IN (SELECT user_id FROM membership_signups)
    GROUP BY s.user_id, s.signed_up_at
)
SELECT
    ${trend.select}count() AS curator_signups,
    countIf(opens_7d >= 10) AS reached_10_opens,
    round(100 * reached_10_opens / curator_signups, 1) AS rate_pct
FROM per_curator${trend.group}`;
}

export function curatorFirstMemberQuery(release, period) {
  const trend = trendParts(period);
  return `WITH ${signupsCte(release)},
${firstMembersCte()}
SELECT
    ${trend.select}countIf(s.signed_up_at < now() - INTERVAL 28 DAY) AS matured_curator_signups,
    countIf(s.signed_up_at < now() - INTERVAL 28 DAY
            AND m.first_member_at >= s.signed_up_at
            AND m.first_member_at <= s.signed_up_at + INTERVAL 28 DAY) AS first_member_within_28d,
    round(100 * first_member_within_28d / matured_curator_signups, 1) AS rate_pct,
    quantileIf(0.5)(dateDiff('hour', s.signed_up_at, m.first_member_at) / 24, m.first_member_at >= s.signed_up_at) AS median_days_to_first_member,
    quantileIf(0.75)(dateDiff('hour', s.signed_up_at, m.first_member_at) / 24, m.first_member_at >= s.signed_up_at) AS p75_days_to_first_member
FROM signups AS s
LEFT JOIN first_members AS m ON m.user_id = s.user_id
WHERE s.user_id NOT IN (SELECT user_id FROM membership_signups)${trend.group}`;
}

// Clock starts when the curator's first plan goes live, so plan setup time is not counted.
export function publishToFirstMemberQuery(release) {
  return `WITH first_publishes AS (
    SELECT distinct_id AS user_id, min(timestamp) AS published_at
    FROM events
    WHERE event = 'membership_plan_published'
      AND ${BRIDGE_PRODUCTION}
      AND ${EXTERNAL_ACTOR}
      AND ${NOT_TEST_ACCOUNT}
      AND ${sinceRelease(release)}
    GROUP BY user_id
),
${firstMembersCte()}
SELECT
    countIf(p.published_at < now() - INTERVAL 28 DAY) AS matured_publishers,
    countIf(p.published_at < now() - INTERVAL 28 DAY
            AND m.first_member_at >= p.published_at
            AND m.first_member_at <= p.published_at + INTERVAL 28 DAY) AS first_member_within_28d,
    round(100 * first_member_within_28d / matured_publishers, 1) AS rate_pct,
    quantileIf(0.5)(dateDiff('hour', p.published_at, m.first_member_at) / 24, m.first_member_at >= p.published_at) AS median_days_to_first_member
FROM first_publishes AS p
LEFT JOIN first_members AS m ON m.user_id = p.user_id`;
}

export function fanStreamingOpenQuery(release, period) {
  const trend = trendParts(period);
  return `WITH ${automatedCte(release)},
visits AS (
    -- One row per visit key; a visit counts as signed in if any view that day was.
    SELECT person_id,
           toString(properties.post_id) AS post_id,
           toDate(timestamp) AS day,
           max(coalesce(toBool(properties.is_authenticated), false)) AS signed_in
    FROM events
    WHERE event = 'post_viewed'
      AND ${UI_PRODUCTION}
      AND ${HAS_POST}
      AND ${EXTERNAL_ACTOR}
      AND coalesce(toBool(properties.is_creator_view), false) = false
      AND ${NOT_TEST_ACCOUNT}
      AND person_id NOT IN (SELECT person_id FROM automated)
      AND ${sinceRelease(release)}
      AND timestamp < toStartOfDay(now())
    GROUP BY person_id, post_id, day
),
opened AS (
    SELECT DISTINCT person_id, toString(properties.post_id) AS post_id, toDate(timestamp) AS day
    FROM events
    WHERE event IN ('streaming_link_opened', 'playlist_opened_on_platform')
      AND ${UI_PRODUCTION}
      AND ${HAS_POST}
      AND ${sinceRelease(release)}
)
SELECT
    ${trend.select}count() AS post_visits,
    countIf(o.post_id != '') AS visits_with_open,
    round(100 * visits_with_open / post_visits, 1) AS rate_pct,
    round(100 * countIf(o.post_id != '' AND v.signed_in) / countIf(v.signed_in), 1) AS signed_in_rate_pct,
    round(100 * countIf(o.post_id != '' AND NOT v.signed_in) / countIf(NOT v.signed_in), 1) AS signed_out_rate_pct
FROM visits AS v
LEFT JOIN opened AS o
    ON o.person_id = v.person_id AND o.post_id = v.post_id AND o.day = v.day${trend.group}`;
}

export function fanFollowOrJoinQuery(release, period) {
  const trend = trendParts(period);
  return `WITH ${automatedCte(release)},
first_views AS (
    SELECT person_id, toString(properties.curator_id) AS curator_id, min(timestamp) AS first_view_at
    FROM events
    WHERE event = 'post_viewed'
      AND ${UI_PRODUCTION}
      AND properties.curator_id IS NOT NULL
      AND ${EXTERNAL_ACTOR}
      AND coalesce(toBool(properties.is_creator_view), false) = false
      AND coalesce(toBool(properties.is_member_view), false) = false
      AND ${NOT_TEST_ACCOUNT}
      AND person_id NOT IN (SELECT person_id FROM automated)
      AND ${sinceRelease(release)}
    GROUP BY person_id, curator_id
    HAVING first_view_at < now() - INTERVAL 7 DAY
),
conversions AS (
    SELECT person_id, toString(properties.curator_id) AS curator_id, event, min(timestamp) AS converted_at
    FROM events
    WHERE event IN ('curator_followed', 'membership_started')
      AND ${BRIDGE_PRODUCTION}
      AND ${EXTERNAL_ACTOR}
      AND ${sinceRelease(release)}
    GROUP BY person_id, curator_id, event
),
per_pair AS (
    SELECT v.person_id, v.curator_id, v.first_view_at AS first_view_at,
           countIf(c.event = 'curator_followed'
                   AND c.converted_at >= v.first_view_at
                   AND c.converted_at <= v.first_view_at + INTERVAL 7 DAY) > 0 AS followed,
           countIf(c.event = 'membership_started'
                   AND c.converted_at >= v.first_view_at
                   AND c.converted_at <= v.first_view_at + INTERVAL 7 DAY) > 0 AS joined,
           countIf(c.event != '' AND c.converted_at < v.first_view_at) > 0 AS converted_before
    FROM first_views AS v
    LEFT JOIN conversions AS c ON c.person_id = v.person_id AND c.curator_id = v.curator_id
    GROUP BY v.person_id, v.curator_id, v.first_view_at
)
SELECT
    ${trend.select}count() AS fan_curator_pairs,
    countIf(followed OR joined) AS followed_or_joined,
    round(100 * followed_or_joined / fan_curator_pairs, 2) AS rate_pct,
    round(100 * countIf(followed) / fan_curator_pairs, 2) AS follow_rate_pct,
    round(100 * countIf(joined) / fan_curator_pairs, 2) AS join_rate_pct
FROM per_pair
WHERE NOT converted_before${trend.group}`;
}

export function fanReturnQuery(release, period) {
  const trend = trendParts(period);
  return `WITH ${automatedCte(release)},
first_visits AS (
    SELECT person_id, min(toDate(timestamp)) AS first_day
    FROM events
    WHERE event = 'post_viewed'
      AND ${UI_PRODUCTION}
      AND ${EXTERNAL_ACTOR}
      AND coalesce(toBool(properties.is_creator_view), false) = false
      AND ${NOT_TEST_ACCOUNT}
      AND person_id NOT IN (SELECT person_id FROM automated)
      AND ${sinceRelease(release)}
    GROUP BY person_id
),
active_days AS (
    SELECT DISTINCT person_id, toDate(timestamp) AS day
    FROM events
    WHERE event = '$pageview'
      AND ${UI_PRODUCTION}
      AND ${sinceRelease(release)}
),
per_fan AS (
    SELECT f.person_id, f.first_day,
           countIf(a.day > f.first_day AND a.day <= f.first_day + 7) > 0 AS returned_7d,
           countIf(a.day > f.first_day AND a.day <= f.first_day + 28) > 0 AS returned_28d
    FROM first_visits AS f
    LEFT JOIN active_days AS a ON a.person_id = f.person_id
    GROUP BY f.person_id, f.first_day
)
SELECT
    ${trend.select}countIf(first_day <= today() - 8) AS fans_7d_cohort,
    countIf(first_day <= today() - 8 AND returned_7d) AS returned_7d,
    round(100 * returned_7d / fans_7d_cohort, 1) AS return_7d_pct,
    countIf(first_day <= today() - 29) AS fans_28d_cohort,
    countIf(first_day <= today() - 29 AND returned_28d) AS returned_28d,
    round(100 * returned_28d / fans_28d_cohort, 1) AS return_28d_pct
FROM per_fan${trend.group}`;
}

export function attributedJoinsQuery(release) {
  return `SELECT
    count() AS memberships_started,
    countIf(properties.source_post_id IS NOT NULL) AS with_source_post,
    round(100 * with_source_post / memberships_started, 1) AS attributed_pct
FROM events
WHERE event = 'membership_started'
  AND ${BRIDGE_PRODUCTION}
  AND ${EXTERNAL_ACTOR}
  AND ${NOT_TEST_ACCOUNT}
  AND ${sinceRelease(release)}`;
}

export function topSourcePostsQuery(release) {
  return `SELECT toString(properties.source_post_id) AS source_post_id,
       toString(properties.curator_id) AS curator_id,
       count() AS memberships_started
FROM events
WHERE event = 'membership_started'
  AND ${BRIDGE_PRODUCTION}
  AND ${EXTERNAL_ACTOR}
  AND ${NOT_TEST_ACCOUNT}
  AND properties.source_post_id IS NOT NULL
  AND ${sinceRelease(release)}
GROUP BY source_post_id, curator_id
ORDER BY memberships_started DESC
LIMIT 20`;
}

function table(key, name, description, query) {
  return { key, name, description, query: { kind: 'DataTableNode', source: { kind: 'HogQLQuery', query } } };
}

function line(key, name, description, query, columns) {
  return {
    key,
    name,
    description,
    query: {
      kind: 'DataVisualizationNode',
      display: 'ActionsLineGraph',
      source: { kind: 'HogQLQuery', query },
      chartSettings: {
        xAxis: { column: 'period' },
        yAxis: columns.map(([column, label]) => ({
          column,
          settings: { formatting: { style: 'short' }, display: { label, displayType: 'line' } },
        })),
        showLegend: columns.length > 1,
        showNullsAsZero: true,
        leftYAxisSettings: { startAtZero: true },
      },
    },
  };
}

export function fanMembershipsDashboardDescription(release) {
  return [
    `Production only: UI $host in cassette.tech, www.cassette.tech; Bridge environment = production; from ${release} UTC.`,
    `Excludes internal_actor (Cassette team), the '${TEST_ACCOUNTS_COHORT_NAME}' cohort, creator self-activity,`,
    'and persons with more than 200 post views in a day. Cohorts count only after their window has elapsed.',
  ].join(' ');
}

// Tiles in dashboard order, each with its width in the 12-column grid, one array per row.
export function fanMembershipsDashboardRows(release) {
  const signupWeek = 'toStartOfWeek(s.signed_up_at)';
  return [
    [
      [3, table('fm_c1_first_post_10_min', 'C1 Curator first post within 10 minutes', 'Curator-intent sign-ups whose first original post came within 10 minutes. Matured: signed up 1+ day ago.', curatorFirstPostQuery(release))],
      [3, table('fm_c2_opens_7_days', 'C2 Curator 10+ opens within 7 days', 'Curator-intent sign-ups whose posts got 10+ streaming opens by others in 7 days. Matured: 7+ days.', curatorOpensQuery(release))],
      [3, table('fm_c3_first_member_28_days', 'C3 Time to first member (from sign-up)', 'First membership within 28 days of sign-up; median and p75 days. Matured: 28+ days.', curatorFirstMemberQuery(release))],
      [3, table('fm_c3_publish_to_first_member', 'C3 Time to first member (from plan publish)', 'First membership within 28 days of the first plan publish; median days. Matured: 28+ days.', publishToFirstMemberQuery(release))],
    ],
    [
      [4, table('fm_f1_streaming_open', 'F1 Post visits that open a streaming app', 'Fan post visits (person, post, UTC day) with a streaming open of the same post that day.', fanStreamingOpenQuery(release))],
      [4, table('fm_f2_follow_or_join_7_days', 'F2 Fan follow or join within 7 days', 'Fan-curator pairs that follow or join within 7 days of the first post visit. Matured: 7+ days.', fanFollowOrJoinQuery(release))],
      [4, table('fm_f3_return', 'F3 Fan 7-day and 28-day return', 'New fans with a production page view on a later day within 7 and 28 days of the first post visit.', fanReturnQuery(release))],
    ],
    [
      [4, line('fm_c1_by_week', 'C1 by sign-up week', 'Weekly C1 rate.', curatorFirstPostQuery(release, signupWeek), [['rate_pct', 'First post within 10 min %']])],
      [4, line('fm_c2_by_week', 'C2 by sign-up week', 'Weekly C2 rate.', curatorOpensQuery(release, 'toStartOfWeek(signed_up_at)'), [['rate_pct', '10+ opens in 7 days %']])],
      [4, line('fm_c3_by_week', 'C3 by sign-up week', 'Curators with a first member within 28 days, by sign-up week.', curatorFirstMemberQuery(release, signupWeek), [['first_member_within_28d', 'Curators with a first member']])],
    ],
    [
      [4, line('fm_f1_by_day', 'F1 by day, signed in or out', 'Daily F1 rate for signed-in and signed-out visits.', fanStreamingOpenQuery(release, 'v.day'), [['signed_in_rate_pct', 'Signed in %'], ['signed_out_rate_pct', 'Signed out %']])],
      [4, line('fm_f2_by_week', 'F2 by first-visit week', 'Weekly F2 rates.', fanFollowOrJoinQuery(release, 'toStartOfWeek(first_view_at)'), [['follow_rate_pct', 'Follow %'], ['join_rate_pct', 'Join %']])],
      [4, line('fm_f3_by_week', 'F3 by first-visit week', 'Weekly F3 rates.', fanReturnQuery(release, 'toStartOfWeek(first_day)'), [['return_7d_pct', '7-day return %'], ['return_28d_pct', '28-day return %']])],
    ],
    [
      [4, table('fm_attributed_joins', 'Attributed joins', 'Share of membership_started with a source post.', attributedJoinsQuery(release))],
      [8, table('fm_top_source_posts', 'Top 20 source posts by joins', 'Posts that fans joined from, by memberships started.', topSourcePostsQuery(release))],
    ],
  ];
}
