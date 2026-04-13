import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('lets a post owner edit and delete a post', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
  });

  await page.goto('/post/post-owner-track');
  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  await page.getByPlaceholder('Add a description...').fill('Updated description from Playwright.');
  await page.locator('#post-privacy').selectOption('private');
  await page.getByLabel('Allow comments').click();
  await page.getByTestId('edit-post-save').click();

  await expect(page.getByText('Updated description from Playwright.')).toBeVisible();
  await expect(page.getByPlaceholder('Comments are turned off')).toBeVisible();

  await page.reload();
  await expect(page.getByPlaceholder('Comments are turned off')).toBeVisible();

  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page.getByPlaceholder('Add a description...')).toHaveValue(
    'Updated description from Playwright.',
  );
  await expect(page.locator('#post-privacy')).toHaveValue('private');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete Post' }).click();

  await expect(page).toHaveURL(/\/profile\/recordsmith(?:\?tab=playlists)?$/);
  const profileMain = page.getByRole('main').last();
  await expect(profileMain).toContainText('No items to display');
  await expect(profileMain).not.toContainText('Paper Hearts');
});
