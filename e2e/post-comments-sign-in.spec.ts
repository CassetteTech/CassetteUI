import { expect, test, type Page } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const POST_PATH = '/post/post-public-track';

type Comment = {
  commentId: string;
  postId: string;
  parentCommentId: string | null;
  userId: string;
  username: string;
  userAvatarUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  likeCount: number;
  likedByCurrentUser: boolean;
  isOwnedByCurrentUser: boolean;
  canDelete: boolean;
};

const existingComment: Comment = {
  commentId: 'comment-1',
  postId: 'post-public-track',
  parentCommentId: null,
  userId: 'someone-else',
  username: 'cratekeeper',
  userAvatarUrl: null,
  content: 'This one is on repeat.',
  createdAt: '2026-10-19T12:00:00Z',
  updatedAt: null,
  likeCount: 2,
  likedByCurrentUser: false,
  isOwnedByCurrentUser: false,
  canDelete: false,
};

async function serveOneComment(page: Page) {
  await page.route(/\/api\/v1\/social\/posts\/[^/]+\/comments\?/, (route) => route.request().method() === 'GET'
    ? route.fulfill({ json: { items: [existingComment], totalItems: 1, page: 1, pageSize: 50 } })
    : route.fallback());
}

test('asks a signed-out visitor to sign in, then returns to the post with comments open', async ({ page }) => {
  await mockCassetteApp(page, { posts: [fixturePosts.publicTrack], googleAuthUser: fixtureUsers.member });
  await serveOneComment(page);
  let commentWrites = 0;
  await page.route(/\/api\/v1\/social\/(posts\/[^/]+\/comments$|comments\/)/, (route) => {
    if (route.request().method() !== 'GET') commentWrites += 1;
    return route.fallback();
  });

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: /Open comments/ }).click();

  const sheet = page.getByRole('dialog', { name: 'Comments' });
  await expect(sheet.getByText('This one is on repeat.')).toBeVisible();
  await expect(sheet.getByText('Sign in to comment', { exact: true })).toBeVisible();
  await expect(sheet.getByRole('textbox')).toHaveCount(0);
  const signIn = sheet.getByRole('link', { name: 'Sign in' });
  await expect(signIn).toHaveAttribute('href', '/auth/signin?redirect=%2Fpost%2Fpost-public-track%3Fcomments%3D1');

  await sheet.getByRole('button', { name: 'Reply' }).click();
  await expect(page).toHaveURL(/\/auth\/signin\?redirect=%2Fpost%2Fpost-public-track%3Fcomments%3D1$/);
  await page.goBack();
  await page.getByRole('button', { name: /Open comments/ }).click();
  await sheet.getByRole('button', { name: '2' }).click();
  await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);
  expect(commentWrites).toBe(0);

  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(page).toHaveURL(POST_PATH);
  await expect(sheet.getByPlaceholder('Share your thoughts...')).toBeVisible();
  await expect(sheet.getByText('Sign in to comment', { exact: true })).toHaveCount(0);
});

type MockState = Awaited<ReturnType<typeof mockCassetteApp>>['state'];

const SIGN_IN_HREF = '/auth/signin?redirect=%2Fpost%2Fpost-public-track%3Fcomments%3D1';

/** Serves the post's comments from a list, answering the first `unauthorizedWrites` writes with 401. */
async function serveComments(page: Page, initial: Comment[], unauthorizedWrites: number) {
  const items = [...initial];
  let failures = unauthorizedWrites;
  await page.route(/\/api\/v1\/social\/(posts\/[^/]+\/comments|comments\/[^/]+\/replies)(\?|$)/, (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      return route.fulfill({ json: { items, totalItems: items.length, page: 1, pageSize: 50 } });
    }
    if (failures > 0) {
      failures -= 1;
      return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
    }
    const content: string = request.postDataJSON().content;
    const created: Comment = {
      ...existingComment,
      commentId: `created-${items.length}`,
      parentCommentId: /\/comments\/([^/]+)\/replies$/.exec(new URL(request.url()).pathname)?.[1] ?? null,
      userId: 'user-member',
      username: 'miagroove',
      content,
      likeCount: 0,
      isOwnedByCurrentUser: true,
      canDelete: true,
    };
    items.push(created);
    return route.fulfill({ status: 201, json: created });
  });
}

const storedDrafts = (page: Page) => page.evaluate(
  () => Object.keys(sessionStorage).filter((key) => key.startsWith('cassette_comment_draft:')).length,
);

/** Ends the session, then signs in from the sheet's alert and returns to the post. */
async function signInAgain(page: Page, state: MockState, user: (typeof fixtureUsers)[keyof typeof fixtureUsers]) {
  state.currentUser = null;
  state.googleAuthUser = user;
  const alert = page.getByRole('dialog', { name: 'Comments' }).getByRole('alert');
  await expect(alert).toContainText('Your session ended. Sign in again to continue.');
  await expect(alert.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', SIGN_IN_HREF);
  await alert.getByRole('link', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(POST_PATH);
}

test('keeps the latest comment draft through sign-in and clears it only after it posts', async ({ page }) => {
  const { state } = await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [fixturePosts.publicTrack] });
  await serveComments(page, [], 1);

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: /Open comments/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Comments' });
  const composer = sheet.getByPlaceholder('Share your thoughts...');
  await composer.fill('Saving this for the drive home.');
  await sheet.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(sheet.getByRole('alert')).toBeVisible();
  await expect(composer).toHaveValue('Saving this for the drive home.');
  await expect(sheet.locator('p', { hasText: 'Saving this for the drive home.' })).toHaveCount(0);

  await composer.fill('Saving this for the drive home, and the drive back.');
  await signInAgain(page, state, fixtureUsers.member);
  await expect(composer).toHaveValue('Saving this for the drive home, and the drive back.');
  await expect(sheet.getByRole('alert')).toHaveCount(0);

  await page.goto(`${POST_PATH}?comments=1`);
  await expect(composer).toHaveValue('Saving this for the drive home, and the drive back.');
  expect(await storedDrafts(page)).toBe(1);

  await sheet.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(sheet.locator('p', { hasText: 'Saving this for the drive home, and the drive back.' })).toBeVisible();
  await expect(composer).toHaveValue('');
  expect(await storedDrafts(page)).toBe(0);
});

test('does not show a draft to a different account after sign-in', async ({ page }) => {
  const { state } = await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [fixturePosts.publicTrack] });
  await serveComments(page, [], 1);

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: /Open comments/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Comments' });
  await sheet.getByPlaceholder('Share your thoughts...').fill('A note only Mia should see.');
  await sheet.getByRole('button', { name: 'Comment', exact: true }).click();

  await signInAgain(page, state, fixtureUsers.viewer);
  await expect(page.getByTestId('navbar-account-link')).toHaveAccessibleName(/Sam Loops/);
  await expect(sheet.getByPlaceholder('Share your thoughts...')).toHaveValue('');
  await expect(sheet.getByText('A note only Mia should see.')).toHaveCount(0);
  expect(await storedDrafts(page)).toBe(0);
});

test('restores a reply to a nested comment, with its thread open, after sign-in', async ({ page }) => {
  const reply = (commentId: string, username: string, content: string): Comment => ({
    ...existingComment, commentId, parentCommentId: existingComment.commentId, username, content, likeCount: 0,
  });
  const { state } = await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [fixturePosts.publicTrack] });
  await serveComments(page, [
    existingComment,
    reply('comment-2', 'nightowl', 'Same here.'),
    reply('comment-3', 'tapehead', 'Every morning.'),
    reply('comment-4', 'latebloomer', 'Found it last week.'),
  ], 1);

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: /Open comments/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Comments' });
  await sheet.getByRole('button', { name: '3 replies' }).click();
  await sheet.getByRole('button', { name: 'Show more' }).click();
  await sheet.locator('.group', { hasText: 'Found it last week.' }).getByRole('button', { name: 'Reply' }).click();
  const editor = sheet.getByPlaceholder('Reply to latebloomer...');
  await editor.fill('Welcome to the club.');
  await sheet.locator('.group', { hasText: 'Found it last week.' }).getByRole('button', { name: 'Reply', exact: true }).last().click();
  await expect(sheet.getByRole('alert')).toBeVisible();
  await expect(editor).toHaveValue('Welcome to the club.');

  await signInAgain(page, state, fixtureUsers.member);
  await expect(editor).toBeVisible();
  await expect(editor).toHaveValue('Welcome to the club.');

  await sheet.locator('.group', { hasText: 'Found it last week.' }).getByRole('button', { name: 'Reply', exact: true }).last().click();
  await expect(sheet.locator('p', { hasText: 'Welcome to the club.' })).toBeVisible();
  expect(await storedDrafts(page)).toBe(0);
});

test('keeps a failed main comment, not the open reply editor, through sign-in', async ({ page }) => {
  const { state } = await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [fixturePosts.publicTrack] });
  await serveComments(page, [existingComment], 1);

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: /Open comments/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Comments' });
  await sheet.locator('.group', { hasText: 'This one is on repeat.' }).getByRole('button', { name: 'Reply' }).click();
  await expect(sheet.getByPlaceholder('Reply to cratekeeper...')).toBeVisible();
  const composer = sheet.getByPlaceholder('Share your thoughts...');
  await composer.fill('My main thought.');
  await sheet.getByRole('button', { name: 'Comment', exact: true }).click();
  await expect(sheet.getByRole('alert')).toBeVisible();
  await expect(sheet.getByPlaceholder('Reply to cratekeeper...')).toBeVisible();
  await composer.fill('My main thought, edited.');

  await signInAgain(page, state, fixtureUsers.member);
  await expect(composer).toHaveValue('My main thought, edited.');
  await expect(sheet.getByPlaceholder('Reply to cratekeeper...')).toHaveCount(0);
});

test('drops a late 401 when the page changes account before it arrives', async ({ page }) => {
  await page.clock.install();
  const { state } = await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [fixturePosts.publicTrack] });
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/api\/v1\/social\/posts\/[^/]+\/comments$/, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    await held;
    return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
  });

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: /Open comments/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Comments' });
  const composer = sheet.getByPlaceholder('Share your thoughts...');
  await composer.fill('A note only Mia should see.');
  // Ages the session check first, so the request's own timeout does not fire during the jump.
  await page.clock.fastForward(61_000);
  const failed = page.waitForResponse((response) => response.request().method() === 'POST'
    && new URL(response.url()).pathname.endsWith('/comments'));
  await sheet.getByRole('button', { name: 'Comment', exact: true }).click();

  state.currentUser = fixtureUsers.viewer;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('navbar-account-link')).toHaveAccessibleName(/Sam Loops/);

  release();
  expect((await failed).status()).toBe(401);
  await page.waitForTimeout(500);
  await expect(composer).toHaveValue('');
  await expect(sheet.getByRole('alert')).toHaveCount(0);
  await expect(sheet.getByText('A note only Mia should see.')).toHaveCount(0);
  expect(await storedDrafts(page)).toBe(0);
});
