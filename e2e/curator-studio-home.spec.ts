/** Verifies Curator Studio opens on Music for every account: the membership invitation above the
    section links, one next step at a time above the music once a plan is live, the earnings at the
    top of Membership, and the pass visitors see in the rail with the audience under it. */

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

test('opens on Music with one invitation and the profile pass', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: ownPosts(7) });

  await page.goto('/studio');

  await expect(page).toHaveURL('/studio/music');
  const music = page.locator('#studio-music');
  await expect(music.getByRole('heading', { name: 'Music', exact: true })).toBeVisible();
  await expect(music.locator('[data-post-id]')).toHaveCount(7);
  await expect(page.getByRole('heading', { name: 'Recent music' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Studio sections' }).getByRole('link', { name: 'Overview' }))
    .toHaveCount(0);

  // The one membership invitation sits above the section links.
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
  for (const view of ['studio-membership', 'studio-billing', 'studio-music']) {
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

test('a live plan shows its pass on every view, and earnings lead Membership', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(2, (index) => (index === 0 ? { privacy: 'subscriber' } : {})),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
  });

  await page.goto('/studio');

  await expect(page.locator('#studio-music [data-post-id]')).toHaveCount(2);
  await expect(page.getByRole('heading', { name: 'Earned' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Earn from your music' })).toHaveCount(0);
  await expect(page.getByTestId('curator-plan-preview')).toBeVisible();
  await expect(page.getByTestId('profile-identity-pass')).toHaveCount(0);

  // The earnings figure and its chart come first on Membership, above the members.
  await openStudioStep(page, 'studio-membership');
  const earned = page.getByRole('heading', { name: 'Earned' });
  await expect(earned).toBeVisible();
  const members = page.getByRole('heading', { name: 'Active members', exact: true });
  await expect(members).toBeVisible();
  expect((await box(members)).y).toBeGreaterThan((await box(earned)).y);
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

test('puts the audience under the pass on every view, and keeps the activity on Membership', async ({ page }) => {
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
  await expect(audience.getByRole('button', { name: 'Members 37', exact: true })).toBeVisible();
  await expect(audience).toContainText('214');
  await expect(page.getByRole('region', { name: 'Latest activity' })).toHaveCount(0);

  for (const view of ['studio-music', 'studio-membership', 'studio-billing']) {
    await openStudioStep(page, view);
    // Pass, then audience, in the rail beside the main column.
    const passBox = await box(pass);
    const audienceBox = await box(audience);
    expect(audienceBox.y).toBeGreaterThanOrEqual(passBox.y + passBox.height);
    expect(Math.abs(audienceBox.x - passBox.x)).toBeLessThanOrEqual(1);
  }

  // Members opens the full statement on Membership and moves focus into it.
  await openStudioStep(page, 'studio-music');
  await audience.getByRole('button', { name: 'Members 37', exact: true }).click();
  await expect(page).toHaveURL('/studio/membership');
  await expect(page.getByTestId('curator-earnings-card')).toContainText('New member earning');
  await expect.poll(() => page.evaluate(() =>
    document.getElementById('studio-members')?.contains(document.activeElement) ?? false)).toBe(true);
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

  await expect(page.locator('#studio-music [data-post-id]')).toHaveCount(2);
  // The audience is read on time and is in the rail, but waits hidden while the slot above it is empty.
  await expect.poll(() => state.curatorAudienceRequests).toBeGreaterThan(0);
  const railAudience = page.locator('aside + div section[aria-label="Audience"]');
  await expect(railAudience).toBeAttached();
  await expect(railAudience).toBeHidden();

  release();
  const pass = page.getByTestId('curator-plan-preview');
  await expect(pass).toBeVisible();
  await expect(railAudience.getByRole('button', { name: 'Members 3', exact: true })).toBeVisible();
  const passBox = await box(pass);
  expect((await box(railAudience)).y).toBeGreaterThanOrEqual(passBox.y + passBox.height);
});

test('says the earnings are unavailable when the ledger read fails, never that nothing was earned', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: ownPosts(1),
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorPayoutAccount: activePayout,
  });
  await page.route((url) => url.pathname === '/api/v1/curators/me/earnings', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"unavailable"}' }));

  await page.goto('/studio/membership');

  await expect(page.getByText('Earnings are unavailable right now. Try again in a moment.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/No earnings/)).toHaveCount(0);
});

test('nudges a live curator above the music when members have had no new members-only post for 14 days', async ({ page }) => {
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
  expect((await box(nudge)).y).toBeLessThan((await box(page.locator('#studio-music'))).y);
  await expect(nudge.getByRole('link', { name: 'Add music' }))
    .toHaveAttribute('href', '/studio/music/new?from=%2Fstudio%2Fmusic');
  await expect(nudge.getByRole('link', { name: 'Choose a public post' }))
    .toHaveAttribute('href', '/studio/music?audience=public');
  // The nudge is the one banner, so sharing waits.
  await expect(page.getByText('Copy your page link to share it with fans.')).toHaveCount(0);
  // The banner belongs to Music.
  await openStudioStep(page, 'studio-membership');
  await expect(nudge).toHaveCount(0);
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
  await expect(page.getByText('Copy your page link to share it with fans.')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /members-only post/ })).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows the audience above the music and the pass under it', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: ownPosts(7),
      curatorProfile,
      curatorAudience: { audienceCount: 4, activeMemberCount: 0 },
    });

    await page.goto('/studio');

    const audience = page.getByRole('region', { name: 'Audience' });
    await expect(audience.getByRole('button', { name: 'Members 0', exact: true })).toBeVisible();
    const music = page.locator('#studio-music');
    await expect(music.locator('[data-post-id]')).toHaveCount(7);
    expect((await box(audience)).y).toBeLessThan((await box(music)).y);
    const pass = page.getByTestId('profile-identity-pass');
    await expect(pass).toBeAttached();
    expect((await box(pass)).y).toBeGreaterThan((await box(music)).y);
  });
});
