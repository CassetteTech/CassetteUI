import { test } from '@playwright/test';
import { fixtureCuratorPage, fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const routes = [
  '/cards-compare',
  `/post/${fixturePosts.publicTrack.postId}`,
  `/profile/${fixtureCuratorPage.curator.username}`,
  '/studio/curator',
  '/explore',
];

for (const route of routes) {
  test(`shot ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 1000 });
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [fixturePosts.publicTrack],
      curatorPage: fixtureCuratorPage,
    });
    await page.goto(route);
    await page.waitForTimeout(1500);
    const name = route.replace(/[^a-z0-9]+/gi, '_');
    await page.screenshot({ path: `/tmp/cards2/${name}.png`, fullPage: true });
  });
}
