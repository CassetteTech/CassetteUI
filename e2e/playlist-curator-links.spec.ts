/** Verifies a curator's own playlist links: fans open them, and owners set them in Add music and Edit post. */

import { expect, test, type Request } from '@playwright/test';
import { fixturePosts, fixtureUsers, type FixturePost } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { dispatchPaste } from './support/paste';

const deezerPlaylist: FixturePost = { ...fixturePosts.playlistSource, sourcePlatform: 'deezer' };
const ownSpotifyCopy = 'https://open.spotify.com/playlist/crate-keeper-copy';
const ownAppleCopy = 'https://music.apple.com/us/playlist/night-shift/pl.u-crate-keeper-copy';

test("opens the curator's own link in place of Cassette's copy", async ({ page }) => {
  await mockCassetteApp(page, { posts: [{ ...deezerPlaylist, curatorLinks: { spotify: ownSpotifyCopy } }] });
  let creationRequests = 0;
  await page.route('**/api/v1/convert/createPlaylist', async (route) => {
    creationRequests += 1;
    await route.fallback();
  });

  await page.goto('/post/post-source-playlist');

  await expect(page.getByRole('link', { name: /Deezer.*Original playlist/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Spotify.*Added by @cratekeeper/ })).toHaveAttribute('href', ownSpotifyCopy);
  await expect(page.getByTestId('cassette-spotify-copy')).toHaveCount(0);
  // Only a service with nothing to open is left to copy.
  const copies = page.getByRole('region', { name: 'Not on your service?' });
  await expect(copies.getByRole('button')).toHaveCount(1);
  await expect(copies.getByRole('button', { name: 'Make a copy on Apple Music' })).toBeVisible();
  expect(creationRequests).toBe(0);
});

test('lets the owner set and remove their own link in Edit post', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCassetteApp(page, { currentUser: fixtureUsers.playlistCurator, posts: [deezerPlaylist] });
  const patches: unknown[] = [];
  page.on('request', (request: Request) => {
    if (request.method() === 'PATCH') patches.push(request.postDataJSON());
  });

  await page.goto('/post/post-source-playlist');
  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();

  const links = page.getByRole('region', { name: 'Where fans listen' });
  const apple = links.getByLabel('Apple Music');
  await expect(links.getByLabel('Spotify')).toBeVisible();
  // The Deezer row always opens the original, so it takes no link.
  await expect(links.getByLabel('Deezer')).toHaveCount(0);

  await apple.fill('https://music.apple.com/us/album/night-shift/1440857781');
  await page.getByTestId('edit-post-save').click();
  await expect(links.getByRole('alert')).toHaveText('Use a playlist link from Apple Music.');
  await expect(apple).toHaveAttribute('aria-invalid', 'true');
  expect(patches).toEqual([]);

  await apple.fill(ownAppleCopy);
  await page.getByTestId('edit-post-save').click();
  await expect(page.getByRole('link', { name: /Apple Music.*Added by @cratekeeper/ })).toHaveAttribute('href', ownAppleCopy);
  expect(patches).toEqual([{ platformLinks: { applemusic: ownAppleCopy } }]);
  await expect(page.getByRole('button', { name: 'Make a copy on Apple Music' })).toHaveCount(0);

  await page.getByTestId('post-actions-trigger').click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(apple).toHaveValue(ownAppleCopy);
  await apple.fill('');
  await page.getByTestId('edit-post-save').click();

  await expect(page.getByRole('button', { name: 'Make a copy on Apple Music' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Added by/ })).toHaveCount(0);
  expect(patches).toEqual([
    { platformLinks: { applemusic: ownAppleCopy } },
    { platformLinks: { applemusic: null } },
  ]);
});

test('sends the links set in Add music with the playlist and shows them on the post', async ({ page }) => {
  const sourceUrl = 'https://www.deezer.com/playlist/908622995';
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    convertTemplates: [{
      ...deezerPlaylist,
      postId: 'post-created-playlist',
      originalUrl: sourceUrl,
      convertedUrls: { deezer: sourceUrl },
    }],
  });
  const conversions: unknown[] = [];
  page.on('request', (request: Request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/convert') {
      conversions.push(request.postDataJSON());
    }
  });

  await page.goto('/studio/music/new');
  await dispatchPaste(page, 'add-music-input', sourceUrl);
  await expect(page.locator('p:visible').filter({ hasText: 'Deezer link pasted' })).toBeVisible();

  // Closed until the curator asks for it.
  const disclosure = page.locator('[data-testid="add-music-playlist-links"]:visible');
  const apple = page.getByRole('textbox', { name: 'Apple Music' }).filter({ visible: true });
  await expect(apple).toBeHidden();
  await disclosure.click();
  await expect(page.getByRole('textbox', { name: 'Deezer' }).filter({ visible: true })).toHaveCount(0);

  await apple.fill('https://open.spotify.com/playlist/wrong-service');
  await page.locator('[data-testid="add-music-submit"]:not([disabled]):visible').click();
  await expect(page.getByText('Use a playlist link from Apple Music.').filter({ visible: true })).toBeVisible();
  expect(conversions).toEqual([]);

  await apple.fill(ownAppleCopy);
  await page.locator('[data-testid="add-music-submit"]:not([disabled]):visible').click();

  await expect(page).toHaveURL(/\/post\/post-created-playlist(\?.*)?$/);
  await expect(page.getByRole('link', { name: /Apple Music.*Added by @miagroove/ })).toHaveAttribute('href', ownAppleCopy);
  expect(conversions).toEqual([expect.objectContaining({ platformLinks: { applemusic: ownAppleCopy } })]);
});
