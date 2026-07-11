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
  await expect(page.locator('#post-privacy')).toHaveValue('private');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete Post' }).click();

  await expect(page).toHaveURL(/\/profile\/recordsmith(?:\?tab=playlists)?$/);
  const profileMain = page.getByRole('main').last();
  await expect(profileMain).toContainText('No playlists yet');
  await expect(profileMain).not.toContainText('Paper Hearts');
});
