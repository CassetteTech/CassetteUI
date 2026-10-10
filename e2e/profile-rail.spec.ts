import { test, expect } from '@playwright/test';
import { mockCassetteApp } from './support/mock-cassette-app';
import {
  fixtureActiveMembershipStatus,
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';

/** On desktop the sidebar belongs to the signed-in user; the viewed profile lives in one rail pass. */
test.describe('profile rail', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('keeps the theme choice in the sidebar footer, not the header', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.viewer, curatorPage: fixtureCuratorPage });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar.getByRole('button', { name: 'Toggle theme' })).toHaveCount(0);
    const theme = sidebar.locator('[data-slot="sidebar-footer"]').getByRole('radiogroup', { name: 'Theme' });
    const dark = theme.getByRole('radio', { name: 'Dark' });
    await dark.click();
    await expect(dark).toBeChecked();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('keeps the signed-in user in the sidebar and puts the curator in the membership pass', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
    });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar.getByText(`@${fixtureUsers.viewer.username}`)).toBeVisible();
    await expect(sidebar.getByText(`@${fixtureUsers.playlistCurator.username}`)).toHaveCount(0);
    await expect(sidebar.getByRole('button', { name: 'Notifications' })).toBeVisible();
    // A double click opens and closes the menu, keeps focus on the button, and selects no nav label.
    const inbox = sidebar.getByRole('button', { name: 'Notifications' });
    await inbox.dblclick();
    await expect(inbox).toHaveAttribute('aria-expanded', 'false');
    await expect(inbox).toBeFocused();
    expect(await page.evaluate(() => window.getSelection()?.toString().trim() ?? '')).toBe('');

    const pass = page.getByTestId('curator-membership-card');
    await expect(pass.getByText(fixtureUsers.playlistCurator.bio!)).toBeVisible();
    await expect(page.getByTestId('profile-identity-pass')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Go back' }).filter({ visible: true })).toHaveCount(1);
  });

  test('shows the profile pass when the profile sells no membership', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      posts: [fixturePosts.publicTrack],
    });

    await page.goto(`/profile/${fixtureUsers.creator.username}`);
    await expect(page).toHaveURL(/tab=tracks/);

    const pass = page.getByTestId('profile-identity-pass');
    await expect(pass.getByText(fixtureUsers.creator.bio!)).toBeVisible();
    await expect(pass.getByText(`@${fixtureUsers.creator.username}`)).toBeVisible();
    await expect(page.getByTestId('curator-membership-card')).toHaveCount(0);
  });

  test('hides the profile pass when a manage pass arrives for a plan that is no longer public', async ({ page }) => {
    // A lapsed member still gets the manage pass even though the curator sells nothing publicly.
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorPage: fixtureFreeCuratorPage,
      membershipStatus: fixtureActiveMembershipStatus,
    });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    await expect(page.getByTestId('curator-membership-card')).toBeVisible();
    await expect(page.getByTestId('profile-identity-pass')).toBeHidden();
  });

  test('shows the owner bar and the owner note on the own page without a second identity', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.playlistCurator,
      curatorPage: { ...fixtureCuratorPage, viewer: { isOwner: true, isMember: false, hasMemberBadge: false } },
    });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    await expect(page.getByTestId('profile-owner-bar')).toBeVisible();
    await expect(page.getByTestId('curator-membership-card')).toBeVisible();
    await expect(page.getByTestId('profile-identity-pass')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Go back' })).toHaveCount(0);
  });
});
