import { expect, test } from '@playwright/test';
import {
  fixtureCuratorProActiveStatus,
  fixtureCuratorProAvailableStatus,
  fixtureCuratorProDefaultStatus,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

for (const mobile of [false, true]) {
  test(`non-Pro owner sees locked insights with sales closed on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    let metricRequests = 0;
    page.on('request', (request) => { if (request.url().endsWith('/insights')) metricRequests++; });
    await mockCassetteApp(page, { currentUser: fixtureUsers.owner, posts: [fixturePosts.ownerTrack] });
    await page.goto('/post/post-owner-track');
    if (mobile) await page.locator('[data-studio-trigger]').click();
    const panel = page.getByTestId(mobile ? 'post-studio-sheet' : 'post-studio-panel');
    await expect(panel).toContainText('Post audience insights are part of Curator Pro.');
    await expect(panel.getByRole('radio', { name: 'Public' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'View Curator Pro' })).toHaveCount(0);
    await expect(panel).not.toContainText('Unique viewers');
    expect(metricRequests).toBe(0);
  });
}

test('Pro owner loses displayed insights when the entitlement changes', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProStatus: fixtureCuratorProActiveStatus,
  });
  await page.goto('/post/post-owner-track');
  const panel = page.getByTestId('post-studio-panel');
  await expect(panel).toContainText('Unique viewers');
  state.curatorProStatus = { ...fixtureCuratorProDefaultStatus };
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
  await expect(panel).toContainText('Post audience insights are part of Curator Pro.');
  await expect(panel).not.toContainText('Unique viewers');
});

test('insights link to Pro only when sales are available', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProStatus: fixtureCuratorProAvailableStatus,
  });
  await page.goto('/post/post-owner-track');
  await expect(page.getByTestId('post-studio-panel').getByRole('link', { name: 'View Curator Pro' })).toBeVisible();
});
