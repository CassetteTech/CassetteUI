import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test.describe('sign out', () => {
  test('tears down the session and does not restore it on reload', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
    });

    await page.goto('/profile/miagroove');

    const signOut = page.getByRole('button', { name: 'Sign Out' }).first();
    await expect(signOut).toBeVisible();
    await signOut.click();

    await expect(page).toHaveURL('/auth/signin');
    await expect(page.getByRole('button', { name: 'Sign Out' })).toHaveCount(0);

    // A protected route must not resolve once the session is gone.
    await page.goto('/profile');
    await expect(page).toHaveURL('/auth/signin');

    // The assertion that actually catches a cookie outliving a cleared client
    // store: a fresh load must still be signed out.
    await page.reload();
    await expect(page).toHaveURL('/auth/signin');
    await expect(page.getByRole('button', { name: 'Sign Out' })).toHaveCount(0);
  });
});
