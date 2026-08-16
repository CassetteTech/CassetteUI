import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('redirects anonymous visitors away from the curator studio', async ({ page }) => {
  await mockCassetteApp(page);

  await page.goto('/studio/curator');

  await expect(page).toHaveURL('/auth/signin');
  await expect(page.getByRole('link', { name: 'Curator Studio' })).toHaveCount(0);
});

test('lets a signed-in user create and edit a free curator profile', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/studio/curator');

  await expect(page.getByRole('heading', { level: 1, name: 'Curator Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Curator Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your free curator profile' })).toBeVisible();
  await expect(page.getByText('Not created', { exact: true })).toBeVisible();

  await page.getByLabel('Headline').fill('Weekly finds for open ears');
  await page.getByLabel('About').fill('Independent picks from across the platform.');
  await page.getByLabel('Genres').fill('Electronic, Jazz');
  await page.getByLabel('Platforms').fill('Spotify, Apple Music');
  await page.getByRole('button', { name: 'Create curator profile' }).click();

  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();
  await expect(page.getByText('active', { exact: true })).toBeVisible();
  await expect.poll(() => state.curatorProfile).toMatchObject({
    status: 'active',
    headline: 'Weekly finds for open ears',
    about: 'Independent picks from across the platform.',
    declaredGenres: ['Electronic', 'Jazz'],
    declaredPlatforms: ['Spotify', 'Apple Music'],
  });

  await page.getByLabel('Headline').fill('Fresh finds every Friday');
  await page.getByLabel('Genres').fill('Electronic, Soul');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect.poll(() => state.curatorProfile?.headline).toBe('Fresh finds every Friday');
  await expect.poll(() => state.curatorProfile?.declaredGenres).toEqual(['Electronic', 'Soul']);

  await page.reload();
  await expect(page.getByLabel('Headline')).toHaveValue('Fresh finds every Friday');
  await expect(page.getByLabel('Genres')).toHaveValue('Electronic, Soul');
});
