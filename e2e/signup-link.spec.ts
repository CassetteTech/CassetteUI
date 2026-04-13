import { expect, test } from '@playwright/test';
import { mockCassetteApp } from './support/mock-cassette-app';

test('preserves attribution query params when /signup redirects to /auth/signup', async ({ page }) => {
  await mockCassetteApp(page);

  await page.goto('/signup?src=friend&utm_medium=dm&utm_campaign=spring_launch');
  await expect(page).toHaveURL(/\/auth\/signup\?/);

  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe('/auth/signup');
  expect(currentUrl.searchParams.get('src')).toBe('friend');
  expect(currentUrl.searchParams.get('utm_medium')).toBe('dm');
  expect(currentUrl.searchParams.get('utm_campaign')).toBe('spring_launch');
});
