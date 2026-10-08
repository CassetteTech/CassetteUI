import { expect, test, type Page } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { fixtureMatchQualityIssueId, mockInternalMatchQuality } from './support/mock-internal-match-quality';

/**
 * The /internal gate resolves client-side, so a deny has to be asserted on the
 * absence of console content, not just on the URL — a gate that redirected but
 * still rendered would leak internal data for a frame.
 */
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
        user: {
          id: fixtureUsers.member.id,
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
      // Hold the refresh open so the gate is parked in its loading state.
      if (call > 1) await refreshHeld;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: fixtureUsers.member.id,
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

    // While the refresh is held the gate is unresolved, so no console content
    // may exist yet — not merely be invisible.
    await expect(consoleHeading(page)).toHaveCount(0);
    await page.waitForTimeout(500);
    await expect(consoleHeading(page)).toHaveCount(0);

    releaseRefresh();
    await expect(consoleHeading(page)).toBeVisible();
  });
});

/** Visible matches only: the sidebar layout renders each page twice and hides one copy by breakpoint. */
const shown = (page: Page, text: string | RegExp) => page.getByText(text).filter({ visible: true });

test.describe('internal match-quality reporting', () => {
  test('shows a Shadow Jev attempt beside the applied deterministic result on an issue', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: 'CassetteTeam' },
    });
    await mockInternalMatchQuality(page, { authorized: true });

    await page.goto(`/internal/issues?issue=${fixtureMatchQualityIssueId}`);

    await expect(shown(page, 'shadow · not applied · spotify-1')).toBeVisible();
    await expect(shown(page, 'Deterministic · spotify-0')).toHaveCount(2);
    await expect(shown(page, 'jev-1.13.0 → jev-1.13.0 · track-selection-prompt-v1')).toBeVisible();
    const options = page.getByRole('table', { name: /Candidate options .* tmd_linked/ });
    await expect(options.getByRole('columnheader', { name: 'Deterministic score' })).toBeVisible();
    await expect(options.getByRole('columnheader', { name: 'Model probability' })).toBeVisible();
    await expect(options.getByRole('row').filter({ hasText: 'spotify-1' })).toContainText(/60\s*0\.750/);
    await expect(options.getByRole('row').filter({ hasText: 'no_match' })).toContainText('0.050');
    await expect(shown(page, 'tmd_expired · not retained')).toBeVisible();

    await expect(shown(page, 'Captured attempts without a shown outcome')).toBeVisible();
    await expect(shown(page, 'shadow · not applied · failed · timeout')).toBeVisible();
    await expect(shown(page, /exceeded the size limit/)).toBeVisible();
  });

  test('reports Jev operations and evidence gaps in conversion quality', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: 'CassetteTeam' },
    });
    const state = await mockInternalMatchQuality(page, { authorized: true });

    await page.goto('/internal/conversion-quality');

    const row = page
      .getByRole('table', { name: /Jev attempts by provider/ })
      .getByRole('row')
      .filter({ hasText: 'single_track_conversion' });
    await expect(row).toContainText('shadow (not applied)');
    await expect(row).toContainText('66.7%');
    await expect(row).toContainText('1 unapplied · 0 applied');
    await expect(row).toContainText('Failed: timeout 1');
    await expect(row).toContainText('Request 280 ms / 7,990 ms');
    await expect(row).toContainText('Added 310 ms / 8,000 ms');
    await expect(row).toContainText('Jev 100.0% · deterministic 0.0%');
    await expect(shown(page, /checked 2026-09-21/)).toBeVisible();
    await expect(shown(page, 'conversion_failed 1 · pending 1')).toBeVisible();
    await expect(shown(page, /operator-configured approved limits/)).toBeVisible();
    const limits = page.getByRole('table', { name: /approved operating limits/ });
    await expect(limits.getByRole('row').filter({ hasText: 'Added time per single track (p95)' }))
      .toContainText('5,000 ms8,000 ms3 measuredExceeded');
    await expect(limits.getByRole('row').filter({ hasText: 'Wrong songs where Jev decided' }))
      .toContainText('Not enough data');
    await expect(limits.getByRole('row').filter({ hasText: 'No-match errors where Jev decided' }))
      .toContainText('Not enough data');

    // The report window stays keyboard operable.
    await page.getByRole('button', { name: '90d', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => state.urls.some(url => url.includes('days=90'))).toBe(true);
  });

  test('neither fetches nor renders match-quality evidence for a non-internal account', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, accountType: 'Standard' },
    });
    const state = await mockInternalMatchQuality(page, { authorized: false });

    for (const path of [`/internal/issues?issue=${fixtureMatchQualityIssueId}`, '/internal/conversion-quality']) {
      await page.goto(path);
      await expect(page).toHaveURL('/');
      await expect(page.getByText(/Jev|Model probability/)).toHaveCount(0);
    }
    expect(state.urls).toEqual([]);
  });
});
