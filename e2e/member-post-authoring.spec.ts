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
  await expect(studio).not.toContainText('To lock posts for members');
});

// An archived plan with no paying members, or a suspended curator, gets no
// members-only option; the post explains where plans are managed.
test('keeps members-only posts closed when Bridge refuses member-post authoring', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [archivedMemberPostPlan],
    memberPostAuthoring: false,
  });

  await page.goto('/post/post-owner-track');
  const studio = page.getByTestId('post-studio-panel');
  await expect(studio).toContainText('To lock posts for members, publish a plan with member posts in Curator Studio.');
  await expect(studio.getByRole('radio', { name: 'Members' })).toBeDisabled();
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
