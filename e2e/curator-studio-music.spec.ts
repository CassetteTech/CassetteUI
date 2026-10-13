/** Verifies Studio Music as the curator's library: each row shows the curation and its owner
    tools, type tabs and the who-can-open-it filter narrow it in the URL, and saved changes keep
    every list correct. */

import { expect, test, type Page } from '@playwright/test';
import { fixturePosts, fixtureUsers, type FixturePost } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const member = fixtureUsers.member;

const own = (postId: string, title: string, overrides: Partial<FixturePost> = {}): FixturePost => ({
  ...fixturePosts.publicTrack,
  postId,
  musicElementId: `${postId}-element`,
  title,
  description: '',
  ownerId: member.id,
  ownerUsername: member.username,
  ...overrides,
});

const rowsOf = (page: Page) => page.getByTestId('studio-music-row');
const rowOf = (page: Page, title: string) => rowsOf(page).filter({ has: page.getByRole('link', { name: title, exact: true }) });
const library = (page: Page) => page.locator('#studio-music');

test('shows each post as its curation with who can open it', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [
      own('music-playlist', 'Late Night Mix', {
        elementType: 'Playlist',
        description: 'Slow-burn house for the drive home.',
        privacy: 'subscriber',
      }),
      own('music-track', 'Open Track', { artist: 'Night Drive' }),
    ],
  });

  await page.goto('/studio/music');

  await expect(page.getByTestId('studio-music-trigger')).toHaveAttribute('aria-current', 'page');
  await expect(rowsOf(page)).toHaveCount(2);
  const playlist = rowOf(page, 'Late Night Mix');
  await expect(playlist).toContainText('Playlist');
  await expect(playlist.getByRole('button', { name: /^Slow-burn house for the drive home\./ })).toBeVisible();
  await expect(playlist.getByRole('button', { name: 'Who can open Late Night Mix: Members only' })).toBeVisible();
  const track = rowOf(page, 'Open Track');
  await expect(track).toContainText('Track · Night Drive');
  await expect(track.getByRole('button', { name: 'Add a note to Open Track' })).toBeVisible();
  await expect(track.getByRole('button', { name: 'Who can open Open Track: Public' })).toBeVisible();
  // The post page's Back returns to the library.
  await expect(track.getByRole('link', { name: 'Open Track', exact: true }))
    .toHaveAttribute('href', '/post/music-track?from=%2Fstudio%2Fmusic');
  await expect(library(page).getByText('2 posts', { exact: true })).toBeVisible();
});

test('narrows the library by type and by who can open it, both kept in the URL', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [
      own('narrow-members-mix', 'Members Mix', { elementType: 'Playlist', privacy: 'subscriber' }),
      own('narrow-open-mix', 'Open Mix', { elementType: 'Playlist' }),
      own('narrow-members-track', 'Members Track', { privacy: 'subscriber' }),
      own('narrow-album', 'Open Album', { elementType: 'Album' }),
    ],
  });

  await page.goto('/studio/music');
  await expect(rowsOf(page)).toHaveCount(4);
  // No artist posts, so no Artists tab.
  const types = page.getByRole('navigation', { name: 'Type of music' });
  await expect(types.getByRole('link', { name: 'Artists' })).toHaveCount(0);

  const playlistsRead = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/activity') && url.searchParams.get('elementType') === 'Playlist'
      && url.searchParams.get('pageSize') === '20';
  });
  await types.getByRole('link', { name: 'Playlists' }).click();
  await playlistsRead;
  await expect(page).toHaveURL('/studio/music?type=playlists');
  await expect(types.getByRole('link', { name: 'Playlists' })).toHaveAttribute('aria-current', 'page');
  await expect(rowsOf(page)).toHaveCount(2);
  await expect(library(page).getByText('2 playlists', { exact: true })).toBeVisible();

  const membersRead = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/activity') && url.searchParams.get('privacy') === 'subscriber'
      && url.searchParams.get('elementType') === 'Playlist';
  });
  await page.getByTestId('studio-music-audience').click();
  await page.getByRole('menuitemradio', { name: 'Members only' }).click();
  await membersRead;
  await expect(page).toHaveURL('/studio/music?type=playlists&audience=members');
  await expect(page.getByTestId('studio-music-audience')).toHaveAccessibleName('Who can open it: Members only');
  await expect(rowsOf(page)).toHaveCount(1);
  await expect(library(page).getByText('1 members-only playlist', { exact: true })).toBeVisible();
  // The post page's Back returns to the same view.
  await expect(rowOf(page, 'Members Mix').getByRole('link', { name: 'Members Mix', exact: true })).toHaveAttribute(
    'href',
    `/post/narrow-members-mix?from=${encodeURIComponent('/studio/music?type=playlists&audience=members')}`,
  );

  await page.reload();
  await expect(rowsOf(page)).toHaveCount(1);
  await expect(rowsOf(page)).toContainText('Members Mix');
  // A post added from here returns to the same view.
  const studioHeader = page.locator('header').filter({ hasText: 'Curator Studio' });
  await expect(studioHeader.getByRole('link', { name: 'Add music', exact: true })).toHaveAttribute(
    'href',
    `/studio/music/new?from=${encodeURIComponent('/studio/music?type=playlists&audience=members')}`,
  );
});

test('shows the Artists tab once the library holds an artist', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('artist-track', 'A Track'), own('artist-post', 'Khruangbin', { elementType: 'Artist' })],
  });

  await page.goto('/studio/music');

  const artists = page.getByRole('navigation', { name: 'Type of music' }).getByRole('link', { name: 'Artists' });
  await artists.click();
  await expect(page).toHaveURL('/studio/music?type=artists');
  await expect(rowsOf(page)).toHaveCount(1);
  await expect(rowsOf(page)).toContainText('Khruangbin');
});

test('changes who can open a post from its row', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    memberPostAuthoring: true,
    posts: [own('row-first', 'First Track'), own('row-second', 'Second Track')],
  });

  await page.goto('/studio/music');
  const row = rowOf(page, 'First Track');
  await row.getByRole('button', { name: 'Who can open First Track: Public' }).click();
  const saved = page.waitForRequest((request) =>
    request.method() === 'PATCH' && request.url().endsWith('/api/v1/social/posts/row-first'));
  await page.getByRole('menuitemradio', { name: /^Members only/ }).click();

  expect((await saved).postDataJSON()).toMatchObject({ privacy: 'subscriber' });
  // The control keeps focus through the save, so the keyboard stays in the row.
  await expect(row.getByRole('button', { name: 'Who can open First Track: Members only' })).toBeFocused();
  await expect(rowOf(page, 'Second Track').getByRole('button', { name: 'Who can open Second Track: Public' })).toBeVisible();
});

test('drops a post from a filtered list once its setting leaves the filter, and moves focus on', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('leave-first', 'First Track'), own('leave-second', 'Second Track'), own('leave-third', 'Third Track')],
  });

  await page.goto('/studio/music?audience=public');
  await expect(library(page).getByText('3 public posts', { exact: true })).toBeVisible();

  await rowOf(page, 'First Track').getByRole('button', { name: 'Who can open First Track: Public' }).click();
  await page.getByRole('menuitemradio', { name: /^Private/ }).click();

  await expect(rowsOf(page)).toHaveCount(2);
  await expect(library(page).getByText('2 public posts', { exact: true })).toBeVisible();
  await expect(rowOf(page, 'Second Track').getByRole('link', { name: 'Second Track', exact: true })).toBeFocused();

  // The unfiltered list keeps the post with its new setting.
  await page.getByTestId('studio-music-audience').click();
  await page.getByRole('menuitemradio', { name: 'All posts' }).click();
  await expect(page).toHaveURL('/studio/music');
  await expect(rowOf(page, 'First Track').getByRole('button', { name: 'Who can open First Track: Private' })).toBeVisible();
});

test('a list cached for another audience shows a post that moved into it', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('moved-open', 'Open Track'), own('moved-hidden', 'Hidden Track', { privacy: 'private' })],
  });

  await page.goto('/studio/music?audience=private');
  await expect(rowsOf(page)).toHaveCount(1);
  await page.getByTestId('studio-music-audience').click();
  await page.getByRole('menuitemradio', { name: 'Public', exact: true }).click();
  await expect(page).toHaveURL('/studio/music?audience=public');
  await rowOf(page, 'Open Track').getByRole('button', { name: 'Who can open Open Track: Public' }).click();
  // The row menu's options carry their summaries, unlike the closing filter menu's.
  await page.getByRole('menuitemradio', { name: /^Private Off your profile/ }).click();
  await expect(rowsOf(page)).toHaveCount(0);

  await page.getByTestId('studio-music-audience').click();
  await page.getByRole('menuitemradio', { name: 'Private', exact: true }).click();
  await expect(rowOf(page, 'Open Track')).toBeVisible();
  await expect(rowsOf(page)).toHaveCount(2);
});

test('without a member plan, Members only points to plan setup', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: member, posts: [own('gate-track', 'Gate Track')] });

  await page.goto('/studio/music');
  await rowOf(page, 'Gate Track').getByRole('button', { name: 'Who can open Gate Track: Public' }).click();

  const membersOption = page.getByRole('menuitemradio', { name: /^Members only/ });
  await expect(membersOption).toBeDisabled();
  await expect(membersOption).toContainText('Needs a published plan with member posts.');
  await page.getByRole('menuitem', { name: 'Set up memberships' }).click();

  await expect(page).toHaveURL('/studio/membership');
  await expect(page.getByTestId('curator-plan-card').getByLabel('Plan name')).toBeFocused();
});

test('after a failed profile read, Set up memberships moves focus to the profile error', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: member, posts: [own('gate-track', 'Gate Track')] });
  await page.route('**/api/v1/curators/me', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"unavailable"}' }));

  await page.goto('/studio/music');
  // Membership renders no plan card behind a failed profile read; the shared error explains it.
  await expect(page.getByText('Could not load your curator profile.')).toBeVisible({ timeout: 15_000 });
  await rowOf(page, 'Gate Track').getByRole('button', { name: 'Who can open Gate Track: Public' }).click();
  await page.getByRole('menuitem', { name: 'Set up memberships' }).click();

  await expect(page).toHaveURL('/studio/membership');
  await expect(page.getByTestId('curator-plan-card')).toHaveCount(0);
  await expect(page.locator('#studio-profile-error')).toBeFocused();
});

test('edits a note in place, sends only the note, and returns focus to it', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('note-track', 'Note Track', { commentsEnabled: false })],
  });

  await page.goto('/studio/music');
  const row = rowOf(page, 'Note Track');
  await row.getByRole('button', { name: 'Add a note to Note Track' }).click();
  const note = page.getByPlaceholder('Add a description...');
  await expect(note).toBeFocused();
  await expect(page.getByRole('switch', { name: 'Allow comments' })).toHaveAttribute('aria-checked', 'false');
  await note.fill('The bridge at 2:40 is the whole reason.');
  const saved = page.waitForRequest((request) =>
    request.method() === 'PATCH' && request.url().endsWith('/api/v1/social/posts/note-track'));
  await page.getByTestId('edit-post-save').click();

  // Settings the curator did not touch stay as Bridge has them.
  expect((await saved).postDataJSON()).toEqual({ description: 'The bridge at 2:40 is the whole reason.' });
  const noteButton = row.locator('[data-row-action="note"]');
  await expect(noteButton).toHaveAccessibleName('The bridge at 2:40 is the whole reason. Edit the note on Note Track');
  await expect(noteButton).toBeFocused();
});

test('saving the note sheet without a change sends nothing', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: member, posts: [own('unchanged-track', 'Unchanged Track')] });
  const patches: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'PATCH') patches.push(request.url());
  });

  await page.goto('/studio/music');
  await rowOf(page, 'Unchanged Track').getByRole('button', { name: 'Add a note to Unchanged Track' }).click();
  await page.getByTestId('edit-post-save').click();

  await expect(page.getByPlaceholder('Add a description...')).toBeHidden();
  await expect(rowOf(page, 'Unchanged Track').getByRole('button', { name: 'Who can open Unchanged Track: Public' })).toBeVisible();
  expect(patches).toEqual([]);
});

test('the profile edit sheet shows the saved comment setting and can turn comments back on', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('profile-quiet', 'Quiet Track', { commentsEnabled: false })],
  });

  await page.goto(`/profile/${member.username}?tab=tracks`);
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  const comments = page.getByRole('switch', { name: 'Allow comments' });
  await expect(comments).toHaveAttribute('aria-checked', 'false');
  await comments.click();
  const saved = page.waitForRequest((request) =>
    request.method() === 'PATCH' && request.url().endsWith('/api/v1/social/posts/profile-quiet'));
  await page.getByTestId('edit-post-save').click();

  expect((await saved).postDataJSON()).toEqual({ commentsEnabled: true });
});

test('deletes a post from its row and moves focus to the next post', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('delete-first', 'First Track'), own('delete-second', 'Second Track')],
  });

  await page.goto('/studio/music');
  await rowOf(page, 'First Track').getByRole('button', { name: 'More actions for First Track' }).click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();
  await page.getByRole('button', { name: 'Delete Post' }).click();

  await expect(rowsOf(page)).toHaveCount(1);
  await expect(library(page).getByText('1 post', { exact: true })).toBeVisible();
  await expect(rowOf(page, 'Second Track').getByRole('link', { name: 'Second Track', exact: true })).toBeFocused();
});

test('a right-click change saves like the row control and keeps a filtered list correct', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('context-first', 'First Track'), own('context-second', 'Second Track')],
  });

  await page.goto('/studio/music?audience=public');
  await rowOf(page, 'First Track').getByRole('link', { name: 'First Track', exact: true }).click({ button: 'right' });
  await page.getByTestId('post-quick-actions').getByRole('menuitem', { name: 'Private' }).click();

  await expect(rowsOf(page)).toHaveCount(1);
  await expect(library(page).getByText('1 public post', { exact: true })).toBeVisible();
});

test('a repost stays public and opens the original post', async ({ page }) => {
  const original = { ...fixturePosts.publicTrack, postId: 'repost-original', title: 'Midnight City' };
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [original, own('repost-own', 'Midnight City', { originalPostId: 'repost-original' })],
  });

  await page.goto('/studio/music');
  const row = rowsOf(page);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('Public repost');
  await expect(row).toContainText(`Reposted from @${fixtureUsers.creator.username}`);
  await expect(row.getByRole('button', { name: /^Who can open/ })).toHaveCount(0);
  await expect(row.getByRole('link', { name: 'Midnight City', exact: true }))
    .toHaveAttribute('href', '/post/repost-original?from=%2Fstudio%2Fmusic');

  await row.getByRole('button', { name: 'More actions for Midnight City' }).click();
  await expect(page.getByRole('menuitem', { name: 'Remove repost' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Edit note' })).toHaveCount(0);
});

test('copies a post link from its row', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: member, posts: [own('share-track', 'Share Track')] });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/studio/music');
  await rowOf(page, 'Share Track').getByRole('button', { name: 'Share Share Track' }).click();

  await expect(page.getByText('Link copied.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(page.url()).origin}/post/share-track`);
});

test('loads more posts after the first page without repeating any', async ({ page }) => {
  const posts = Array.from({ length: 25 }, (_, index) => own(`page-post-${index}`, `Paged Track ${index + 1}`));
  await mockCassetteApp(page, { currentUser: member, posts });

  await page.goto('/studio/music');
  await expect(rowsOf(page)).toHaveCount(20);
  await expect(library(page).getByText('20 of 25', { exact: true })).toBeVisible();

  const nextPage = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname.endsWith('/activity') && url.searchParams.get('page') === '2';
  });
  await page.getByRole('button', { name: 'Show more' }).click();
  await nextPage;

  await expect(rowsOf(page)).toHaveCount(25);
  await expect(rowOf(page, 'Paged Track 25')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0);
});

test('reads the loaded pages again after a removal before showing more, even when a refresh failed', async ({ page }) => {
  const posts = Array.from({ length: 21 }, (_, index) => own(`gap-post-${index}`, `Gap Track ${index + 1}`));
  await mockCassetteApp(page, { currentUser: member, posts });

  await page.goto('/studio/music');
  await expect(rowsOf(page)).toHaveCount(20);
  let failing = true;
  await page.route('**/api/v1/profile/*/activity**', (route) => (failing
    ? route.fulfill({ status: 503, json: { message: 'Unavailable' } })
    : route.fallback()));

  await rowOf(page, 'Gap Track 1').getByRole('button', { name: 'More actions for Gap Track 1' }).click();
  await page.getByRole('menuitem', { name: 'Delete post' }).click();
  await page.getByRole('button', { name: 'Delete Post' }).click();
  await expect(rowsOf(page)).toHaveCount(19);
  await expect(library(page).getByRole('alert')).toHaveText('Could not refresh your music.', { timeout: 15_000 });

  // Gap Track 21 moved up into the first page; reading page 2 by offset alone would skip it.
  failing = false;
  await page.getByRole('button', { name: 'Show more' }).click();
  await expect(rowOf(page, 'Gap Track 21')).toBeVisible();
  await expect(rowsOf(page)).toHaveCount(20);
  await expect(page.getByRole('button', { name: 'Show more' })).toHaveCount(0);
  await expect(library(page).getByRole('alert')).toHaveCount(0);
});

test('retries a failed first read', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: member, posts: [own('retry-track', 'Retry Track')] });
  let failing = true;
  await page.route('**/api/v1/profile/*/activity**', (route) => (failing
    ? route.fulfill({ status: 503, json: { message: 'Unavailable' } })
    : route.fallback()));

  await page.goto('/studio/music');
  await expect(library(page).getByRole('alert')).toHaveText('Could not load your music.', { timeout: 15_000 });

  failing = false;
  await library(page).getByRole('button', { name: 'Try again' }).click();
  await expect(rowOf(page, 'Retry Track')).toBeVisible();
});

test('empty views lead to Add music or back to everything', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: member, posts: [own('empty-track', 'Only Track')] });

  await page.goto('/studio/music?type=albums');
  await expect(library(page).getByRole('heading', { name: 'No albums yet' })).toBeVisible();
  await expect(library(page).getByRole('link', { name: 'Add music' }))
    .toHaveAttribute('href', `/studio/music/new?from=${encodeURIComponent('/studio/music?type=albums')}`);

  await page.goto('/studio/music?audience=private');
  await expect(library(page).getByRole('heading', { name: 'No private posts' })).toBeVisible();
  await library(page).getByRole('link', { name: 'Show all posts' }).click();
  await expect(page).toHaveURL('/studio/music');
  await expect(rowOf(page, 'Only Track')).toBeVisible();
});

test('the public page offers the library at the open type', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: member,
    posts: [own('owner-bar-mix', 'Owner Mix', { elementType: 'Playlist' })],
  });

  await page.goto(`/profile/${member.username}?tab=playlists`);

  await expect(page.getByTestId('profile-owner-bar').getByRole('link', { name: 'Manage in Studio' }))
    .toHaveAttribute('href', '/studio/music?type=playlists');
});

test('Add music names the Studio section it returns to', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: member });

  await page.goto('/studio/music/new?from=%2Fstudio%2Fmusic%3Ftype%3Dplaylists');

  await expect(page.getByRole('button', { name: 'Music', exact: true }).filter({ visible: true })).toBeVisible();
});
