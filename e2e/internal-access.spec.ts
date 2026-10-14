import { expect, test, type Page } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const consoleHeading = (page: Page) => page.getByRole('heading', { name: 'Console', level: 1 });

/**
 * Overrides the session endpoint with a per-call account type, so the gate's
 * "unknown type triggers one refresh" branch can be driven. Registered after
 * mockCassetteApp so it wins — Playwright matches the most recent route first.
 */
async function withSessionAccountTypes(
  page: Page,
  accountTypes: Array<string | number | null>,
) {
  let call = 0;
  await page.route('**/api/auth/session', async (route) => {
    const accountType = accountTypes[Math.min(call, accountTypes.length - 1)];
    call += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        authenticated: true,
        activeMembershipCount: 0,
        feedCuratorCount: 0,
        user: {
          userId: fixtureUsers.member.id,
          email: fixtureUsers.member.email,
          username: fixtureUsers.member.username,
          displayName: fixtureUsers.member.displayName,
          isOnboarded: true,
          accountType,
        },
      }),
    });
  });
}

test.describe('internal console access', () => {
  test('lets a Cassette team account into the console', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: 'CassetteTeam' },
    });

    await page.goto('/internal');

    await expect(consoleHeading(page)).toBeVisible();
    await expect(page).toHaveURL('/internal');
  });

  test('bounces an authenticated non-internal account home without rendering the console', async ({
    page,
  }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: 'Standard' },
    });

    await page.goto('/internal');

    await expect(page).toHaveURL('/');
    await expect(consoleHeading(page)).toHaveCount(0);
  });

  test('grants access when an unknown account type resolves to internal on refresh', async ({
    page,
  }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: null },
    });
    await withSessionAccountTypes(page, [null, 'CassetteTeam']);

    await page.goto('/internal');

    await expect(consoleHeading(page)).toBeVisible();
  });

  test('bounces when an unknown account type resolves to non-internal on refresh', async ({
    page,
  }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: null },
    });
    await withSessionAccountTypes(page, [null, 'Standard']);

    await page.goto('/internal');

    await expect(page).toHaveURL('/');
    await expect(consoleHeading(page)).toHaveCount(0);
  });

  test('does not render console content while access is still resolving', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: null },
    });

    let releaseRefresh = () => {};
    const refreshHeld = new Promise<void>((resolve) => {
      releaseRefresh = resolve;
    });

    let call = 0;
    await page.route('**/api/auth/session', async (route) => {
      call += 1;
      if (call > 1) await refreshHeld;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          authenticated: true,
          activeMembershipCount: 0,
          feedCuratorCount: 0,
          user: {
            userId: fixtureUsers.member.id,
            email: fixtureUsers.member.email,
            username: fixtureUsers.member.username,
            displayName: fixtureUsers.member.displayName,
            isOnboarded: true,
            accountType: call > 1 ? 'CassetteTeam' : null,
          },
        }),
      });
    });

    await page.goto('/internal');

    await expect(consoleHeading(page)).toHaveCount(0);
    await page.waitForTimeout(500);
    await expect(consoleHeading(page)).toHaveCount(0);

    releaseRefresh();
    await expect(consoleHeading(page)).toBeVisible();
  });
});
