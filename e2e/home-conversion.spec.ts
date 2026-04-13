import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { dispatchPaste } from './support/paste';

test.describe('home conversion funnel', () => {
  test('auto-converts a supported pasted link', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', fixtureConvertTemplates.homeTrack.originalUrl);

    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
    await expect(page.getByText('Midnight City')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open in Apple Music' })).toBeVisible();
  });

  test('shows validation for unsupported pasted links', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', 'https://www.youtube.com/watch?v=not-supported');

    await expect(page).toHaveURL('/');
    await expect(page.getByText("This music service isn't supported yet.")).toBeVisible();
  });

  test('preserves the source route when landing on a converted post', async ({ page }) => {
    await mockCassetteApp(page);

    const from = '/profile/miagroove?tab=tracks';
    await page.goto(
      `/post?url=${encodeURIComponent(fixtureConvertTemplates.homeTrack.originalUrl)}&from=${encodeURIComponent(from)}`,
    );

    await expect(page).toHaveURL(
      `/post/post-home-converted?from=${encodeURIComponent(from)}`,
    );
    await expect(page.getByText('Midnight City')).toBeVisible();
  });
});
