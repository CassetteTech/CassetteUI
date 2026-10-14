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

  test('cross-fades a theme change unless the user reduces motion', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.viewer, curatorPage: fixtureCuratorPage });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    // Counts view transitions on <html> without changing how they run.
    await page.addInitScript(() => {
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        const html = document.documentElement;
        html.dataset.viewTransitions = String(Number(html.dataset.viewTransitions ?? 0) + 1);
        return start(update);
      };
    });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    const html = page.locator('html');
    const theme = page.locator('[data-slot="sidebar-footer"]').getByRole('radiogroup', { name: 'Theme' });
    await theme.getByRole('radio', { name: 'Dark' }).click();
    await expect(html).toHaveClass(/\bdark\b/);
    await expect(html).toHaveAttribute('data-view-transitions', '1');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await theme.getByRole('radio', { name: 'Light' }).click();
    await expect(html).not.toHaveClass(/\bdark\b/);
    await expect(html).toHaveAttribute('data-view-transitions', '1');
  });

  test('puts the inbox in the sidebar header and gives the account row, active in Studio, the full width', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.viewer, curatorPage: fixtureCuratorPage });

    await page.goto('/studio');

    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar.locator('[data-slot="sidebar-header"]').getByRole('button', { name: 'Notifications' })).toBeVisible();
    const accountRow = sidebar.locator('a[aria-current="page"]', { hasText: `@${fixtureUsers.viewer.username}` });
    await expect(accountRow).toBeVisible();
    const addMusic = sidebar.getByRole('link', { name: 'Add music' });
    const [rowBox, buttonBox] = await Promise.all([accountRow.boundingBox(), addMusic.boundingBox()]);
    expect(rowBox?.width).toBe(buttonBox?.width);
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
    await expect(page.getByTestId('profile-music')).toBeVisible();

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

  test('shows the owner the plain profile pass, as visitors see it, and leads to Studio from the strip', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.playlistCurator,
      curatorPage: { ...fixtureFreeCuratorPage, viewer: { isOwner: true, isMember: false, hasMemberBadge: false } },
    });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    // Membership setup is a Studio tool; the public page is a read-only preview.
    const pass = page.getByTestId('profile-identity-pass');
    await expect(pass).toBeVisible();
    await expect(pass.getByRole('link', { name: 'Start earning from your music' })).toHaveCount(0);
    const studio = page.getByTestId('profile-preview-strip').getByRole('link', { name: 'Open Studio' });
    await expect(studio).toHaveAttribute('href', '/studio/music');
    await studio.click();
    await expect(page).toHaveURL('/studio/music');
  });

  test('gives a visitor Follow, not membership setup, on a page that sells none', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.viewer, curatorPage: fixtureFreeCuratorPage });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    const pass = page.getByTestId('profile-identity-pass');
    await expect(pass.getByRole('button', { name: /^Follow/ })).toBeVisible();
    await expect(pass.getByRole('link', { name: 'Start earning from your music' })).toHaveCount(0);
  });

  test('never offers membership setup to an owner with a live plan, also on Liked', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.playlistCurator,
      curatorPage: { ...fixtureCuratorPage, viewer: { isOwner: true, isMember: false, hasMemberBadge: false } },
    });

    // Liked shows the profile pass, also for a page that sells a membership. The check waits for the
    // curator page read, which says whether a plan is live.
    const curatorRead = page.waitForResponse((response) => response.url().includes('/curators/cratekeeper/page'));
    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}?tab=liked`);
    await curatorRead;

    await expect(page.getByTestId('profile-identity-pass')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start earning from your music' })).toHaveCount(0);

    // Music shows the live plan's pass; back on Liked, the cached page still says no setup.
    await page.getByRole('tab', { name: 'Music' }).click();
    await expect(page.getByTestId('curator-membership-card')).toBeVisible();
    await page.getByRole('tab', { name: /^Liked/ }).click();
    await expect(page.getByTestId('profile-identity-pass')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start earning from your music' })).toHaveCount(0);
  });

  test('shows the preview strip and the visitor pass with an inert Join on the own page, without a second identity', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.playlistCurator,
      curatorPage: { ...fixtureCuratorPage, viewer: { isOwner: true, isMember: false, hasMemberBadge: false } },
    });

    await page.goto(`/profile/${fixtureUsers.playlistCurator.username}`);

    await expect(page.getByTestId('profile-preview-strip')).toBeVisible();
    const pass = page.getByTestId('curator-membership-card');
    await expect(pass).toBeVisible();
    await expect(pass.getByTestId('membership-join-preview')).toHaveAttribute('aria-disabled', 'true');
    await expect(pass.getByText('Manage in Curator Studio')).toHaveCount(0);
    await expect(page.getByTestId('profile-identity-pass')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Go back' })).toHaveCount(0);
  });
});
