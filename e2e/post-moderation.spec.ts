/** Verifies post owners can edit visibility and comments, then delete their post. */

import { expect, test } from '@playwright/test';
import {
  fixtureActiveCuratorProfile,
  fixtureActiveMemberPostPlan,
  fixtureCuratorProActiveStatus,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('lets a post owner edit and delete a post', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorProStatus: fixtureCuratorProActiveStatus,
    curatorPlans: [fixtureActiveMemberPostPlan],
  });

  await page.goto('/post/post-owner-track');

  // Owners land with the post studio docked open on the Access tab.
  const studio = page.getByTestId('post-studio-panel');
  await expect(studio).toBeVisible();
  await expect(studio).toContainText('Member posts');
  // The radio is controlled by the saved post, so it flips only after the PATCH lands.
  await studio.getByRole('radio', { name: 'Members only' }).click();
  await expect(studio.getByRole('radio', { name: 'Members only' })).toBeChecked();
  await studio.getByRole('radio', { name: 'Insights' }).click();
  await expect(studio).toContainText('Views');
  await page.getByRole('button', { name: 'Close post studio' }).click();

  // Right-click anywhere on the post for quick actions; owners get their tools too.
  await page.getByRole('heading', { name: 'Paper Hearts' }).click({ button: 'right' });
  const quickActions = page.getByTestId('post-context-menu');
  await expect(quickActions).toBeVisible();
  await expect(quickActions.getByRole('menuitem', { name: 'Listen on Spotify' })).toBeVisible();
  await quickActions.getByRole('menuitem', { name: 'Access & insights' }).click();
  await expect(studio).toBeVisible();
  await page.getByRole('button', { name: 'Close post studio' }).click();

  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  await page.getByPlaceholder('Add a description...').fill('Updated description from Playwright.');
  await page.locator('#post-privacy').selectOption('subscriber');
  const commentsSwitch = page.getByRole('switch', { name: 'Allow comments' });
  await expect(commentsSwitch).toHaveAttribute('aria-checked', 'true');
  await commentsSwitch.click();
  await expect(commentsSwitch).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('edit-post-save').click();

  await expect(
    page.locator('main p:visible').filter({ hasText: 'Updated description from Playwright.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Open comments/ }).click();
  await expect(page.getByPlaceholder('Comments are turned off')).toBeVisible();
  await page.getByRole('button', { name: 'Close comments' }).last().click();

  await page.reload();
  await page.getByRole('button', { name: /Open comments/ }).click();
  await expect(page.getByPlaceholder('Comments are turned off')).toBeVisible();
  await page.getByRole('button', { name: 'Close comments' }).last().click();

  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.getByPlaceholder('Add a description...')).toHaveValue(
    'Updated description from Playwright.',
  );
  await expect(page.locator('#post-privacy')).toHaveValue('subscriber');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete Post' }).click();

  await expect(page).toHaveURL(/\/profile\/recordsmith(?:\?tab=playlists)?$/);
  const profileMain = page.getByRole('main').last();
  await expect(profileMain).toContainText('No playlists yet');
  await expect(profileMain).not.toContainText('Paper Hearts');
});
