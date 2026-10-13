/** Verifies the Studio Overview starts from music for every account: recent posts with their row
    tools, one next step at a time, the membership invitation above the section links, and the pass
    visitors see in the rail, with the audience and the latest activity under it. */

import { expect, test, type Locator } from '@playwright/test';
import type { CuratorProfile } from '../src/services/curator';
import type { CuratorEarningsHistoryItem } from '../src/services/curator-earnings';
import {
  fixtureActiveMemberPostPlan,
  fixturePosts,
  fixtureUsers,
  type FixturePost,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { openStudioStep } from './support/studio-steps';

const curatorProfile: CuratorProfile = {
  id: 'cpr_FixtureOverviewProfile1',
  status: 'active',
  headline: null,
  about: null,
  declaredGenres: [],
  declaredPlatforms: [],
  suspensionReason: null,
  createdAtUtc: '2026-08-16T12:00:00Z',
  statusChangedAtUtc: '2026-08-16T12:00:00Z',
};

const activePayout = {
  onboardingStatus: 'active' as const,
  transfersCapabilityStatus: 'active' as const,
  requirementsDue: false,
  capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
};

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (!found) throw new Error('Expected a laid-out element.');
  return found;
};

/** The member's own posts, newest first, as the activity read returns them. */
const ownPosts = (count: number, overrides: (index: number) => Partial<FixturePost> = () => ({})): FixturePost[] =>
  Array.from({ length: count }, (_, index) => ({
    ...fixturePosts.publicTrack,
    postId: `post-overview-${index + 1}`,
    musicElementId: `element-overview-${index + 1}`,
    title: `Overview Track ${index + 1}`,
    ownerId: fixtureUsers.member.id,
    ownerUsername: fixtureUsers.member.username,
    createdAt: daysAgo(index + 1),
    ...overrides(index),
  }));

test('shows the five newest posts with their tools, one invitation, and the profile pass', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: ownPosts(7) });

  await page.goto('/studio');

  const recent = page.locator('#studio-recent-music');
  await expect(recent.getByRole('heading', { name: 'Recent music' })).toBeVisible();
  await expect(recent.locator('[data-post-id]')).toHaveCount(5);
  await expect(recent.locator('[data-post-id]').first()).toContainText('Overview Track 1');
  await expect(recent.getByRole('button', { name: /^Who can open Overview Track 1/ })).toBeVisible();
  await expect(recent.getByRole('link', { name: 'All music' })).toHaveAttribute('href', '/studio/music');
  // A post opened from the Overview returns to it.
  await expect(recent.getByRole('link', { name: 'Overview Track 1' }).first())
    .toHaveAttribute('href', /from=%2Fstudio$/);

  // The one membership invitation sits above the section links, not in the Overview's column.
  const invitation = page.getByRole('region', { name: 'Earn from your music' });
  await expect(invitation).toBeVisible();
  expect((await box(invitation)).y).toBeLessThan((await box(page.getByRole('navigation', { name: 'Studio sections' }))).y);

  // The rail shows the pass visitors see on the public page, with membership setup for its owner;
  // Membership previews the plan instead.
  const rail = page.getByRole('complementary', { name: 'Your public pass' });
  await expect(rail.getByTestId('profile-identity-pass')).toBeVisible();
  await expect(rail.getByRole('link', { name: 'Start earning from your music' }))
    .toHaveAttribute('href', '/studio/membership#studio-plan');
  await expect(page.getByTestId('curator-plan-preview')).toHaveCount(0);

  await invitation.getByRole('button', { name: 'Set up a membership' }).click();
  await expect(page).toHaveURL('/studio/membership');
  const planRail = page.getByRole('complementary', { name: 'Membership plan' });
  await expect(planRail.getByTestId('curator-plan-preview')).toBeVisible();
  await expect(page.getByTestId('profile-identity-pass')).toHaveCount(0);
});

test('keeps the membership invitation above the section links on every view', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: ownPosts(2) });

  await page.goto('/studio');

  const invitation = page.getByRole('region', { name: 'Earn from your music' });
  const links = page.getByRole('navigation', { name: 'Studio sections' });
  await expect(invitation).toBeVisible();
  const linksTop = (await box(links)).y;
  for (const view of ['studio-music', 'studio-membership', 'studio-billing', 'studio-overview']) {
    await openStudioStep(page, view);
    await expect(invitation).toBeVisible();
    expect((await box(links)).y).toBe(linksTop);
  }

  // The pass offers the same setup and opens the plan in place.
  await page.getByRole('complementary', { name: 'Your public pass' })
    .getByRole('link', { name: 'Start earning from your music' })
    .click();
  await expect(page).toHaveURL('/studio/membership');
  await expect(page.getByTestId('curator-plan-card').getByLabel('Plan name')).toBeFocused();
});

test('a live plan shows its pass on every view, and earnings lead the music', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(2, (index) => (index === 0 ? { privacy: 'subscriber' } : {})),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
  });

  await page.goto('/studio');

  await expect(page.getByRole('heading', { name: 'Earned' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent music' })).toBeVisible();
  const earned = await page.getByRole('heading', { name: 'Earned' }).boundingBox();
  const music = await page.getByRole('heading', { name: 'Recent music' }).boundingBox();
  expect(music!.y).toBeGreaterThan(earned!.y);
  await expect(page.getByRole('region', { name: 'Earn from your music' })).toHaveCount(0);

  await expect(page.getByTestId('curator-plan-preview')).toBeVisible();
  await expect(page.getByTestId('profile-identity-pass')).toHaveCount(0);
  await openStudioStep(page, 'studio-music');
  await expect(page.getByTestId('curator-plan-preview')).toBeVisible();
});

/** Member earnings, newest first, as the ledger returns them. */
const ledgerItems = (count: number): CuratorEarningsHistoryItem[] =>
  Array.from({ length: count }, (_, index) => ({
    kind: 'allocation',
    amountMinor: 425 + index,
    currency: 'USD',
    status: 'accrued',
    occurredAtUtc: daysAgo(index + 1),
    payableAtUtc: daysAgo(index - 13),
  }));

test('puts the audience and the latest activity in the rail under the pass', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(2),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
    curatorAudience: { audienceCount: 214, activeMemberCount: 37 },
    curatorEarnings: {
      activeMemberCount: 37,
      items: ledgerItems(7),
      balances: { currency: 'USD', earnedThisMonth: 425, accrued: 2989, payable: 0, blocked: 0, paidOut: 0, nextPayableAt: null },
    },
  });

  await page.goto('/studio');

  const pass = page.getByTestId('curator-plan-preview');
  const audience = page.getByRole('region', { name: 'Audience' });
  const activity = page.getByRole('region', { name: 'Latest activity' });
  await expect(audience.getByRole('button', { name: 'Members 37', exact: true })).toBeVisible();
  await expect(audience).toContainText('214');
  // The five newest events, newest first.
  await expect(activity.getByRole('listitem')).toHaveCount(5);
  await expect(activity.getByRole('listitem').first()).toContainText('New member earning');
  await expect(activity.getByRole('listitem').first()).toContainText('$4.25');

  // Pass, audience, activity, top to bottom in the rail, beside the main column.
  const passBox = await box(pass);
  const audienceBox = await box(audience);
  const activityBox = await box(activity);
  const musicBox = await box(page.locator('#studio-recent-music'));
  expect(audienceBox.y).toBeGreaterThanOrEqual(passBox.y + passBox.height);
  expect(activityBox.y).toBeGreaterThanOrEqual(audienceBox.y + audienceBox.height);
  expect(audienceBox.x).toBeGreaterThanOrEqual(musicBox.x + musicBox.width);
  expect(Math.abs(audienceBox.x - passBox.x)).toBeLessThanOrEqual(1);

  // View all opens the full statement on Membership and moves focus into it.
  await activity.getByRole('button', { name: 'View all' }).click();
  await expect(page).toHaveURL('/studio/membership');
  await expect(page.getByTestId('curator-earnings-card')).toBeVisible();
  await expect.poll(() => page.evaluate(() =>
    document.getElementById('studio-members')?.contains(document.activeElement) ?? false)).toBe(true);
  // The Overview's side column stays on the Overview.
  await expect(page.getByRole('region', { name: 'Audience' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Latest activity' })).toHaveCount(0);
});

test('holds the audience while the pass loads, so the pass never pushes it down', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(2),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
    curatorAudience: { audienceCount: 12, activeMemberCount: 3 },
  });
  // The live plan's pass needs the pricing read; hold it.
  let release = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/curators/pricing', async (route) => {
    await released;
    await route.fallback();
  });

  await page.goto('/studio');

  await expect(page.getByRole('heading', { name: 'Earned' })).toBeVisible();
  // The audience is read on time and is in the page, but waits hidden while the slot above it is empty.
  await expect.poll(() => state.curatorAudienceRequests).toBeGreaterThan(0);
  const hiddenAudience = page.locator('section[aria-label="Audience"]');
  await expect(hiddenAudience).toBeAttached();
  await expect(hiddenAudience).toBeHidden();

  release();
  const pass = page.getByTestId('curator-plan-preview');
  const audience = page.getByRole('region', { name: 'Audience' });
  await expect(pass).toBeVisible();
  await expect(audience.getByRole('button', { name: 'Members 3', exact: true })).toBeVisible();
  const passBox = await box(pass);
  expect((await box(audience)).y).toBeGreaterThanOrEqual(passBox.y + passBox.height);
});

test('says the activity is unavailable when the ledger read fails, never that nothing happened', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(1),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
  });
  await page.route((url) => url.pathname === '/api/v1/curators/me/earnings', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"unavailable"}' }));

  await page.goto('/studio');

  const activity = page.getByRole('region', { name: 'Latest activity' });
  await expect(activity.getByText('Activity is unavailable right now.')).toBeVisible({ timeout: 15_000 });
  await expect(activity.getByText(/Activity shows up here/)).toHaveCount(0);
});

test('nudges a live curator whose members have had no new members-only post for 14 days', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(2, (index) => (index === 1 ? { privacy: 'subscriber', createdAt: daysAgo(20) } : {})),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
  });

  await page.goto('/studio');

  const nudge = page.getByRole('status').filter({ hasText: 'No new members-only post in 20 days.' });
  await expect(nudge).toBeVisible();
  await expect(nudge.getByRole('link', { name: 'Add music' })).toHaveAttribute('href', '/studio/music/new?from=%2Fstudio');
  await expect(nudge.getByRole('link', { name: 'Choose a public post' }))
    .toHaveAttribute('href', '/studio/music?audience=public');
  // The nudge is the one banner, so sharing waits.
  await expect(page.getByText('Copy your page link to share it with fans.')).toHaveCount(0);
});

test('names a live curator with no members-only post yet, and stays quiet without member posts', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(1),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
  });

  await page.goto('/studio');
  await expect(page.getByRole('status').filter({ hasText: 'You have no members-only posts yet.' })).toBeVisible();

  // A plan without member posts cannot lock a post, so there is nothing to nudge.
  state.curatorPlans = [{ ...fixtureActiveMemberPostPlan, featureKeys: [] }];
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Earned' })).toBeVisible();
  await expect(page.getByText('Copy your page link to share it with fans.')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /members-only post/ })).toHaveCount(0);
});
