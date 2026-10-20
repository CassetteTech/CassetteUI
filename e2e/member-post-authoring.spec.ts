import { expect, test } from '@playwright/test';
import {
  fixtureActiveCuratorProfile,
  fixtureActiveMemberPostPlan,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const archivedMemberPostPlan = {
  ...fixtureActiveMemberPostPlan,
  status: 'archived' as const,
  archivedAtUtc: '2026-08-20T12:00:00Z',
};

test('lets a curator lock posts while an archived plan still has paying members', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [archivedMemberPostPlan],
    memberPostAuthoring: true,
  });

  await page.goto('/studio/music/new');
  await page.getByRole('radio', { name: 'Members' }).click();
  await expect(page.getByRole('radio', { name: 'Members' })).toBeChecked();
  await expect(page.getByText('To lock posts')).toHaveCount(0);

  await page.goto('/post/post-owner-track');
  const studio = page.getByTestId('post-studio-panel');
  await studio.getByRole('radio', { name: 'Members' }).click();
  await expect(studio.getByRole('heading', { name: 'Members only' })).toBeVisible();
  await expect(studio.getByText('To lock posts')).toHaveCount(0);
});

test('keeps members-only posts closed when Bridge refuses member-post authoring', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [archivedMemberPostPlan],
    memberPostAuthoring: false,
  });

  let updates = 0;
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && request.url().includes('/social/posts/')) updates++;
  });
  await page.goto('/post/post-owner-track');
  const studio = page.getByTestId('post-studio-panel');
  const members = studio.getByRole('radio', { name: 'Members' });
  const prompt = studio.getByText('To lock posts, publish a membership plan with member posts.');
  // The column grows when the authoring read places the unseen prompt and the insights
  // check ends, then glides to re-center on the post card. Measure where it comes to rest.
  await expect(prompt).toBeAttached();
  await expect(prompt).toBeHidden();
  const insights = studio.getByRole('heading', { name: 'Insights' });
  const boxes = async () => ({ studio: await studio.boundingBox(), insights: await insights.boundingBox() });
  let placed: Awaited<ReturnType<typeof boxes>> | null = null;
  await expect.poll(async () => {
    const previous = JSON.stringify(placed);
    placed = await boxes();
    return JSON.stringify(placed) === previous;
  }).toBe(true);
  await members.click();
  await expect(prompt).toBeVisible();
  await expect(studio.getByRole('link', { name: 'Set up memberships' })).toHaveAttribute('href', '/studio/membership');
  await expect(members).not.toBeChecked();
  await expect(studio.getByRole('heading', { name: 'Public' })).toBeVisible();
  expect({ studio: await studio.boundingBox(), insights: await insights.boundingBox() }).toEqual(placed);

  await studio.getByRole('radio', { name: 'Public' }).click();
  await expect(prompt).toBeHidden();
  expect({ studio: await studio.boundingBox(), insights: await insights.boundingBox() }).toEqual(placed);

  await studio.getByRole('radio', { name: 'Public' }).press('ArrowRight');
  await expect(prompt).toBeVisible();
  await expect(members).toBeFocused();
  await expect(members).not.toBeChecked();
  expect(updates).toBe(0);
});

test('replaces an older visibility summary with the locked members prompt', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [{ ...fixturePosts.ownerTrack, privacy: 'friends' }],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [archivedMemberPostPlan],
    memberPostAuthoring: false,
  });

  await page.goto('/post/post-owner-track');
  const studio = page.getByTestId('post-studio-panel');
  const summary = studio.getByText('This post uses an older setting. Choose who can open it.');
  await expect(summary).toBeVisible();
  await studio.getByRole('radio', { name: 'Members' }).click();
  await expect(summary).toBeHidden();
  await expect(studio.getByRole('link', { name: 'Set up memberships' })).toBeVisible();
  await expect(studio.getByRole('radio', { name: 'Members' })).not.toBeChecked();
});

test('shows the locked members option and setup prompt on Add Music', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [archivedMemberPostPlan],
    memberPostAuthoring: false,
  });

  await page.goto('/studio/music/new');
  const publicOption = page.getByRole('radio', { name: 'Public' });
  const members = page.getByRole('radio', { name: 'Members' });
  await expect(publicOption).toBeChecked();
  await publicOption.press('ArrowRight');
  await expect(members).toBeFocused();
  await expect(members).not.toBeChecked();
  const prompt = page.getByRole('status').getByText('To lock posts');
  await expect(prompt).toBeVisible();
  await expect(page.getByRole('link', { name: 'Set up memberships' })).toHaveAttribute('href', '/studio/membership');

  await members.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'Private' })).toBeChecked();
  await expect(prompt).toBeHidden();
});

test('keeps members-only posts closed when Bridge cannot answer the authoring read', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    memberPostAuthoring: true,
  });
  await page.route('**/api/v1/curators/me/member-post-authoring', (route) => route.fulfill({ status: 404, body: '{}' }));

  await page.goto('/post/post-owner-track');
  const studio = page.getByTestId('post-studio-panel');
  await expect(studio.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await expect(studio.getByRole('radio', { name: 'Members' })).toBeDisabled();
});
