/** Verifies the Studio Overview starts from music for every account: recent posts with their row
    tools, one next step at a time, and the pass visitors see in the rail. */

import { expect, test } from '@playwright/test';
import type { CuratorProfile } from '../src/services/curator';
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

  // Music first: the one membership invitation comes after it.
  const invitation = page.getByRole('region', { name: 'Earn from your music' });
  await expect(invitation).toBeVisible();
  const recentBox = await recent.boundingBox();
  const invitationBox = await invitation.boundingBox();
  expect(invitationBox!.y).toBeGreaterThan(recentBox!.y);

  // The rail shows the pass visitors see on the public page; Membership previews the plan instead.
  const rail = page.getByRole('complementary', { name: 'Your public pass' });
  await expect(rail.getByTestId('profile-identity-pass')).toBeVisible();
  await expect(page.getByTestId('curator-plan-preview')).toHaveCount(0);

  await invitation.getByRole('button', { name: 'Set up a membership' }).click();
  await expect(page).toHaveURL('/studio/membership');
  const planRail = page.getByRole('complementary', { name: 'Membership plan' });
  await expect(planRail.getByTestId('curator-plan-preview')).toBeVisible();
  await expect(page.getByTestId('profile-identity-pass')).toHaveCount(0);
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
