/** Verifies that members-only authoring follows Bridge's decision, not the plan's own status. */

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

// Archiving stops new joins only. Members who still pay keep receiving member
// posts, so Bridge lets the curator keep publishing them.
test('lets a curator lock posts while an archived plan still has paying members', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [archivedMemberPostPlan],
    memberPostAuthoring: true,
  });

  await page.goto('/add-music');
  await page.locator('#add-music-privacy:visible').click();
  await expect(page.getByRole('option', { name: 'Members only', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.goto('/post/post-owner-track');
  const studio = page.getByTestId('post-studio-panel');
  await studio.getByRole('radio', { name: 'Members' }).click();
  await expect(studio.getByRole('heading', { name: 'Members only' })).toBeVisible();
  await expect(studio).not.toContainText('To lock posts');
});

// An archived plan with no paying members, or a suspended curator, gets a locked
// members-only option: choosing it keeps the post's setting and points to Curator Studio.
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
  const prompt = 'To lock posts, publish a membership plan with member posts.';
  await expect(studio).not.toContainText('To lock posts');
  await members.click();
  await expect(studio).toContainText(prompt);
  await expect(studio.getByRole('link', { name: 'Set up memberships' })).toHaveAttribute('href', '/studio/curator');
  await expect(members).not.toBeChecked();
  await expect(studio.getByRole('heading', { name: 'Public' })).toBeVisible();

  // Choosing the current setting again dismisses the prompt.
  await studio.getByRole('radio', { name: 'Public' }).click();
  await expect(studio).not.toContainText(prompt);

  // Arrow keys reach the locked option the same way: the prompt, no save.
  await studio.getByRole('radio', { name: 'Public' }).press('ArrowRight');
  await expect(studio).toContainText(prompt);
  await expect(members).toBeFocused();
  await expect(members).not.toBeChecked();
  expect(updates).toBe(0);
});

// Without an answer from Bridge, nothing in the browser infers authoring from the
// plan: the option stays closed until the decision can be read.
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
