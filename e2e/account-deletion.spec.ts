import { expect, test, type Page } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const openDeleteModal = async (page: Page) => {
  await page.goto('/profile/miagroove/edit');
  await page.getByRole('button', { name: 'Delete account' }).click();
};

const confirmField = (page: Page) => page.getByPlaceholder('Enter your username');
const confirmButton = (page: Page) => page.getByRole('button', { name: 'Delete My Account' });

test.describe('account deletion', () => {
  test('requires the username confirmation before deletion can fire', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });

    await openDeleteModal(page);

    await expect(confirmButton(page)).toBeDisabled();

    await confirmField(page).fill('notmyusername');
    await expect(page.getByText("Username doesn't match")).toBeVisible();
    await expect(confirmButton(page)).toBeDisabled();

    await confirmField(page).fill('miagroove');
    await expect(confirmButton(page)).toBeEnabled();
  });

  test('leaves the account intact when the confirmation is cancelled', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });

    await openDeleteModal(page);
    await confirmField(page).fill('miagroove');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(confirmButton(page)).toHaveCount(0);

    // Still signed in, and the session survives a reload.
    await page.reload();
    await expect(page).toHaveURL('/profile/miagroove/edit');
  });

  test('signs the user out and lands them on a public route after deletion', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });

    await openDeleteModal(page);
    await confirmField(page).fill('miagroove');
    await confirmButton(page).click();

    await expect(page).toHaveURL('/');

    // The session is genuinely gone, not just navigated away from.
    await page.goto('/profile');
    await expect(page).toHaveURL('/auth/signin');
  });

  test('surfaces a retryable error and keeps the session usable when deletion fails', async ({
    page,
  }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      accountDeleteFailures: 1,
    });

    await openDeleteModal(page);
    await confirmField(page).fill('miagroove');
    await confirmButton(page).click();

    await expect(page.getByText('Failed to delete account. Please try again.')).toBeVisible();
    await expect(page).toHaveURL('/profile/miagroove/edit');

    // The retry succeeds against the same open modal.
    await confirmButton(page).click();
    await expect(page).toHaveURL('/');
  });
});
