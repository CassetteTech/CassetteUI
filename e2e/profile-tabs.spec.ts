import { expect, test, type Page } from '@playwright/test';
import { type FixturePost, fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const buildOwnedPost = (
  overrides: Partial<FixturePost> & Pick<FixturePost, 'postId' | 'musicElementId' | 'elementType' | 'title' | 'originalUrl'>,
): FixturePost => {
  const {
    postId,
    musicElementId,
    elementType,
    title,
    originalUrl,
    artist,
    description,
    convertedUrls,
    ...restOverrides
  } = overrides;

  return {
    postId,
    musicElementId,
    elementType,
    title,
    artist: artist || 'Mia Groove',
    description: description || '',
    ownerId: fixtureUsers.member.id,
    ownerUsername: fixtureUsers.member.username,
    privacy: 'public',
    likeCount: 0,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 0,
    originalUrl,
    convertedUrls: convertedUrls || {
      spotify: originalUrl,
    },
    ...restOverrides,
  };
};

const getProfileContentOverflow = async (page: Page) => {
  const profileContentPane = page.locator('[data-testid="profile-content-pane"]:visible').first();
  await expect(profileContentPane).toBeVisible();

  return profileContentPane.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
};

test.describe('profile tabs', () => {
  test('does not highlight any account tab when viewing another user profile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        {
          ...fixturePosts.publicTrack,
          ownerId: fixtureUsers.creator.id,
          ownerUsername: fixtureUsers.creator.username,
        },
      ],
    });

    await page.goto('/profile/djaurora');
    await expect(page.getByRole('tab', { name: 'Music' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/\/profile\/djaurora$/);
    await expect(page.locator('[data-sidebar="menu-button"][data-active="true"]')).toHaveCount(0);
  });

  test('opens Music with every post at once, and keeps Liked in the url', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        buildOwnedPost({
          postId: 'member-playlist-post',
          musicElementId: 'playlist-member-1',
          elementType: 'Playlist',
          title: 'Night Tape',
          artist: 'Mia Groove',
          originalUrl: 'https://open.spotify.com/playlist/member-playlist-1',
        }),
        buildOwnedPost({
          postId: 'member-track-post',
          musicElementId: 'track-member-1',
          elementType: 'Track',
          title: 'Signal Fade',
          artist: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/track/member-track-1',
        }),
        buildOwnedPost({
          postId: 'member-album-post',
          musicElementId: 'album-member-1',
          elementType: 'Album',
          title: 'Night Engine',
          artist: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/album/member-album-1',
        }),
        buildOwnedPost({
          postId: 'member-artist-post',
          musicElementId: 'artist-member-1',
          elementType: 'Artist',
          title: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/artist/member-artist-1',
        }),
      ],
    });
    const activityRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/api\/v1\/profile\/[^/]+\/activity/.test(request.url())) activityRequests.push(request.url());
    });

    await page.goto('/profile/miagroove');
    const music = page.getByTestId('profile-music');
    await expect(music).toContainText('Night Tape');
    await expect(music).toContainText('Signal Fade');
    await expect(music).toContainText('Night Engine');
    await expect(music).toContainText('Circuit Bloom');
    expect(activityRequests).toHaveLength(1);
    await expect(page).toHaveURL(/\/profile\/miagroove$/);

    const musicOverflow = await getProfileContentOverflow(page);
    expect(musicOverflow.scrollHeight).toBeLessThanOrEqual(musicOverflow.clientHeight + 1);

    await page.getByRole('tab', { name: /Liked/ }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=liked$/);
    await expect(page.getByRole('main').last()).toContainText('No liked posts yet');

    await page.getByRole('tab', { name: 'Music' }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove$/);
    await expect(page.getByTestId('profile-music')).toContainText('Night Tape');
  });

  test('uses liked post owner badges instead of the profile owner badge', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await mockCassetteApp(page, {
      currentUser: {
        ...fixtureUsers.member,
        accountType: 'CassetteTeam',
      },
      posts: [
        {
          ...fixturePosts.publicTrack,
          likedByCurrentUser: true,
        },
      ],
    });

    await page.goto('/profile/miagroove?tab=liked');
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=liked$/);

    const content = page.locator('[data-testid="profile-content-pane"]:visible').first();
    const likedPost = content.locator('a[href^="/post/post-public-track"]').first();
    await expect(likedPost).toContainText('@djaurora');
    await expect(likedPost.getByAltText('Cassette Team')).toHaveCount(0);
  });

  test('opens an older type link on Music at that type, with a way back to All', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        buildOwnedPost({
          postId: 'member-track-only-post',
          musicElementId: 'track-member-only-1',
          elementType: 'Track',
          title: 'Daybreak Signal',
          artist: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/track/member-track-only-1',
        }),
        buildOwnedPost({
          postId: 'member-playlist-only-post',
          musicElementId: 'playlist-member-only-1',
          elementType: 'Playlist',
          title: 'Dawn Tape',
          originalUrl: 'https://open.spotify.com/playlist/member-playlist-only-1',
        }),
      ],
    });

    await page.goto('/profile/miagroove?tab=tracks');
    await expect(page).toHaveURL(/\/profile\/miagroove\?type=tracks$/);
    const music = page.getByTestId('profile-music');
    await expect(music).toContainText('Daybreak Signal');
    await expect(music).not.toContainText('Dawn Tape');
    await expect(page.getByRole('radio', { name: 'Tracks' })).toBeChecked();

    await page.getByRole('radio', { name: 'All' }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove$/);
    await expect(music).toContainText('Dawn Tape');
  });

  test('a drag across the page tabs or the list tabs selects no text', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        buildOwnedPost({
          postId: 'member-drag-track',
          musicElementId: 'track-member-drag-1',
          elementType: 'Track',
          title: 'Daybreak Signal',
          originalUrl: 'https://open.spotify.com/track/member-drag-1',
        }),
      ],
    });

    await page.goto('/profile/miagroove?type=tracks');
    const strip = page.getByRole('tablist', { name: 'Profile content' });
    const list = page.getByRole('radiogroup', { name: 'Music filter' });
    await expect(list.getByRole('radio', { name: 'Tracks' })).toBeChecked();

    const selectedAfterDrag = async (from: typeof strip, to: typeof strip) => {
      const start = await from.boundingBox();
      const end = await to.boundingBox();
      if (!start || !end) throw new Error('Expected laid-out tabs.');
      await page.mouse.move(start.x + start.width + 2, start.y + start.height / 2);
      await page.mouse.down();
      await page.mouse.move(end.x + end.width + 4, end.y + end.height / 2, { steps: 10 });
      await page.mouse.up();
      return page.evaluate(() => window.getSelection()?.toString() ?? '');
    };
    expect(await selectedAfterDrag(strip.getByRole('tab', { name: 'Music' }), strip.getByRole('tab', { name: /^Liked/ }))).toBe('');
    expect(await selectedAfterDrag(list.getByRole('radio', { name: 'All' }), list.getByRole('radio', { name: 'Tracks' }))).toBe('');
  });

  test('shows owner-aware empty copy on Music', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
    });

    await page.goto('/profile/miagroove');
    const main = page.getByRole('main').last();
    await expect(main).toContainText('No music yet');
    await expect(main).toContainText('Add music to start your page. Fans see it here.');
    await expect(main.getByRole('link', { name: 'Add your first music' })).toHaveAttribute('href', '/studio/music/new');

    await page.goto('/profile/miagroove?type=albums');
    await expect(main).toContainText('No albums yet');
    await expect(main.getByRole('link', { name: 'Add music' })).toHaveAttribute('href', '/studio/music/new');

    await page.goto('/profile/djaurora');
    await expect(main).toContainText('No music yet');
    await expect(main).toContainText('has not shared any music yet.');
    await expect(main.getByRole('link', { name: /Add/ })).toHaveCount(0);
  });

  test('lists an older public post behind a full page of newer private ones', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        ...Array.from({ length: 21 }, (_, index) => buildOwnedPost({
          postId: `member-private-post-${index + 1}`,
          musicElementId: `track-member-private-${index + 1}`,
          elementType: 'Track',
          title: `Private Draft ${index + 1}`,
          originalUrl: `https://open.spotify.com/track/member-private-${index + 1}`,
          privacy: 'private',
        })),
        buildOwnedPost({
          postId: 'member-public-keeper',
          musicElementId: 'track-member-public-keeper',
          elementType: 'Track',
          title: 'Public Keeper',
          originalUrl: 'https://open.spotify.com/track/member-public-keeper',
        }),
      ],
    });

    await page.goto('/profile/miagroove');
    const music = page.getByTestId('profile-music');
    await expect(music).toContainText('Public Keeper');
    await expect(music).not.toContainText('Private Draft');
  });

  test('renders the profile not-found state instead of a generic error', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
    });
    const activityRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/profile/profile-that-does-not-exist/activity')) {
        activityRequests.push(request.url());
      }
    });

    await page.goto('/profile/profile-that-does-not-exist');

    await expect(page.getByRole('heading', { name: 'User Not Found' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Error' })).toHaveCount(0);
    expect(activityRequests).toEqual([]);
  });

  test('replaces broken profile artwork with a stable fallback', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        buildOwnedPost({
          postId: 'member-broken-artwork',
          musicElementId: 'track-broken-artwork',
          elementType: 'Track',
          title: 'Broken Artwork Track',
          originalUrl: 'https://open.spotify.com/track/broken-artwork',
          artworkUrl: '/images/does-not-exist.png',
        }),
      ],
    });

    await page.goto('/profile/miagroove');

    const artwork = page.getByRole('img', { name: 'Broken Artwork Track' });
    await expect.poll(() => artwork.evaluate((element) => element.tagName)).toBe('DIV');
  });

  test('only shows desktop page scrolling when Music needs it', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: Array.from({ length: 18 }, (_, index) =>
        buildOwnedPost({
          postId: `member-track-post-${index + 1}`,
          musicElementId: `track-member-${index + 1}`,
          elementType: 'Track',
          title: `Signal Fade ${index + 1}`,
          artist: 'Circuit Bloom',
          originalUrl: `https://open.spotify.com/track/member-track-${index + 1}`,
        }),
      ),
    });

    await page.goto('/profile/miagroove');
    await expect(page.getByTestId('profile-music')).toContainText('Signal Fade 1');

    const musicOverflow = await getProfileContentOverflow(page);
    expect(musicOverflow.scrollHeight).toBeGreaterThan(musicOverflow.clientHeight + 1);
  });
});
