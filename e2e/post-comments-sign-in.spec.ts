import { expect, test, type Page } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const POST_PATH = '/post/post-public-track';

const existingComment = {
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

test('keeps a draft and offers sign-in when the session ends while commenting', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [fixturePosts.publicTrack] });
  await page.route(/\/api\/v1\/social\/posts\/[^/]+\/comments$/, (route) => route.request().method() === 'POST'
    ? route.fulfill({ status: 401, json: { message: 'Unauthorized' } })
    : route.fallback());

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: /Open comments/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Comments' });
  const composer = sheet.getByPlaceholder('Share your thoughts...');
  await composer.fill('Saving this for the drive home.');
  await sheet.getByRole('button', { name: 'Comment', exact: true }).click();

  const alert = sheet.getByRole('alert');
  await expect(alert).toContainText('Your session ended. Sign in again to continue.');
  await expect(alert.getByRole('link', { name: 'Sign in' }))
    .toHaveAttribute('href', '/auth/signin?redirect=%2Fpost%2Fpost-public-track%3Fcomments%3D1');
  await expect(composer).toHaveValue('Saving this for the drive home.');
  await expect(sheet.locator('p', { hasText: 'Saving this for the drive home.' })).toHaveCount(0);

  await page.unroute(/\/api\/v1\/social\/posts\/[^/]+\/comments$/);
  await page.goto(`${POST_PATH}?comments=1`);
  await expect(page).toHaveURL(POST_PATH);
  await expect(sheet.getByPlaceholder('Share your thoughts...')).toHaveValue('Saving this for the drive home.');
  await expect(sheet.getByRole('alert')).toHaveCount(0);
});
