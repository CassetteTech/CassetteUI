import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('keeps the users list page when the active filter is clicked again', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: { ...fixtureUsers.member, accountType: 'CassetteTeam' },
  });
  await page.route(
    (url) => url.pathname === '/api/v1/internal/users',
    (route) => {
      const requested = Number(new URL(route.request().url()).searchParams.get('page') ?? '1');
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          page: requested,
          pageSize: 25,
          totalItems: 60,
          totalPages: 3,
          actorCanAssignVerified: false,
        }),
      });
    },
  );

  await page.goto('/internal/users');
  await expect(page.getByText('1/3 · 60 users')).toBeVisible();

  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('2/3 · 60 users')).toBeVisible();

  await page.getByRole('radiogroup', { name: 'Type' }).getByRole('radio', { name: 'All' }).click();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('3/3 · 60 users')).toBeVisible();
});
