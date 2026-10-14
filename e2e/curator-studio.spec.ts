/** Tests curator onboarding, payout setup, plan economics, member counts, and earnings in Studio. */

import { expect, type Page, test } from '@playwright/test';
import type {
  CuratorPayoutAccount,
  CuratorProfile,
} from '../src/services/curator';
import type { CuratorPlan, CuratorPricing } from '../src/services/curator-plans';
import type { CuratorEarningsHistoryItem } from '../src/services/curator-earnings';
import {
  fixtureActiveMemberPostPlan,
  fixtureCuratorMemberCounts,
  fixtureCuratorProActiveStatus,
  fixtureCuratorProAvailableStatus,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { openStudioStep } from './support/studio-steps';

const STUDIO_PATH = '/studio';
const STUDIO_PAYOUTS_PATH = '/studio/payouts';
const PAYOUT_URL = 'https://connect.stripe.test/payout-onboarding';

const curatorProfile: CuratorProfile = {
  id: 'cpr_FixtureStudioProfile01',
  status: 'active',
  headline: 'Independent weekly finds',
  about: 'A free curator profile.',
  declaredGenres: ['Electronic'],
  declaredPlatforms: ['Spotify'],
  suspensionReason: null,
  createdAtUtc: '2026-08-16T12:00:00Z',
  statusChangedAtUtc: '2026-08-16T12:00:00Z',
};

const curatorBornePricing: CuratorPricing = {
  curatorProMonthlyPriceMinor: 500,
  currency: 'USD',
  platformFeeBps: 1000,
  serviceFeeBps: 0,
  serviceFeeFixedMinor: 0,
  processingBorneBy: 'curator',
  processingFeeBps: 360,
  processingFeeFixedMinor: 30,
  payoutOpsFeeBps: 0,
  payoutCadence: 'monthly',
  minPayoutMinor: 1000,
};

const earningsItems: CuratorEarningsHistoryItem[] = [
  {
    kind: 'allocation',
    amountMinor: 125,
    currency: 'USD',
    status: 'forfeited',
    occurredAtUtc: '2026-08-16T12:00:00Z',
    payableAtUtc: '2026-08-30T12:00:00Z',
  },
  {
    kind: 'transfer',
    amountMinor: 900,
    currency: 'USD',
    status: 'succeeded',
    occurredAtUtc: '2026-08-15T12:00:00Z',
  },
  {
    kind: 'allocation',
    amountMinor: 425,
    currency: 'USD',
    status: 'accrued',
    occurredAtUtc: '2026-08-14T12:00:00Z',
    payableAtUtc: '2026-08-28T12:00:00Z',
  },
  ...Array.from({ length: 8 }, (_, index): CuratorEarningsHistoryItem => ({
    kind: 'allocation',
    amountMinor: 200 + index,
    currency: 'USD',
    status: 'accrued',
    occurredAtUtc: `2026-08-${String(13 - index).padStart(2, '0')}T12:00:00Z`,
    payableAtUtc: `2026-08-${String(27 - index).padStart(2, '0')}T12:00:00Z`,
  })),
];

const draftPlan: CuratorPlan = {
  id: 'mpl_FixtureStudioDraft01',
  name: 'First Draft',
  description: 'Weekly picks.',
  amountMinor: 500,
  annualAmountMinor: null,
  currency: 'USD',
  serviceFeeMinor: null,
  annualServiceFeeMinor: null,
  status: 'draft',
  featureKeys: ['member_posts'],
  createdAtUtc: '2026-08-16T12:00:00Z',
  publishedAtUtc: null,
  archivedAtUtc: null,
};

// One post on the curator's own page finishes the first launch step, so a test can start at the plan steps.
const ownPost = {
  ...fixturePosts.publicTrack,
  postId: 'post-studio-own-track',
  ownerId: fixtureUsers.member.id,
  ownerUsername: fixtureUsers.member.username,
};

const payoutAccount = (
  overrides: Partial<CuratorPayoutAccount> = {},
): CuratorPayoutAccount => ({
  onboardingStatus: 'onboarding',
  transfersCapabilityStatus: null,
  requirementsDue: false,
  capabilityCheckedAtUtc: null,
  ...overrides,
});

async function hostPayoutPage(page: Page, url = PAYOUT_URL) {
  await page.route(url, (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<main>Secure payout setup</main>',
  }));
}

test('redirects anonymous visitors away from the curator studio', async ({ page }) => {
  await mockCassetteApp(page);

  await page.goto(STUDIO_PATH);

  await expect(page).toHaveURL('/auth/signin');
  await expect(page.getByRole('link', { name: 'Curator Studio' })).toHaveCount(0);
});

test('starts an empty Studio with the first music on Music and the setup steps on Membership', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto(STUDIO_PATH);

  // Music comes first: no checklist, and no membership invitation before the page has music.
  await expect(page).toHaveURL('/studio/music');
  await expect(page.getByRole('heading', { name: 'Music', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add your first music' }))
    .toHaveAttribute('href', '/studio/music/new?from=%2Fstudio%2Fmusic');
  await expect(page.getByRole('heading', { name: 'Earn from your music' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Start earning from your music' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Membership setup' })).toHaveCount(0);

  await openStudioStep(page, 'studio-membership');
  await expect(page.getByRole('heading', { name: 'Membership setup' })).toBeVisible();
  await expect(page.getByText('0 of 3 done', { exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Membership setup' }).getByRole('listitem')).toHaveText([
    'Design your membershipNext',
    'Set up payouts',
    'Publish your plan',
  ]);
  expect(state.curatorPlanCreateRequests).toEqual([]);
});

test('treats a failed music read as unknown and recovers on retry', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [ownPost],
  });
  let musicFailures = 10;
  // Only the music check: one item of any type and audience. Studio Music reads its list on its own.
  await page.route((url) => /\/api\/v1\/profile\/[^/]+\/activity$/.test(url.pathname)
    && url.searchParams.get('pageSize') === '1'
    && !url.searchParams.has('elementType')
    && !url.searchParams.has('privacy'), (route) => {
    if (musicFailures === 0) return route.fallback();
    musicFailures -= 1;
    return route.fulfill({ status: 503, json: { message: 'Unavailable' } });
  });

  await page.goto(STUDIO_PATH);

  const musicAlert = page.getByRole('alert').filter({ hasText: 'Could not check the music on your page.' });
  await expect(musicAlert).toBeVisible({ timeout: 10_000 });
  // Without an answer about the music, Studio offers no membership invitation.
  await expect(page.getByRole('heading', { name: 'Earn from your music' })).toHaveCount(0);

  musicFailures = 0;
  await musicAlert.locator('..').getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByText('Could not check the music on your page.')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Earn from your music' })).toBeVisible();
});

test('saves a first draft without a profile and advances the membership setup', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [ownPost],
  });

  await page.goto(STUDIO_PATH);

  await expect(page.getByRole('heading', { level: 1, name: 'Curator Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Curator Studio' })).toBeVisible();
  // A page with music gets one invitation; the plan editor is on the Membership view.
  await page.getByRole('button', { name: 'Set up a membership' }).click();
  await expect(page).toHaveURL('/studio/membership');
  const card = page.getByTestId('curator-plan-card');
  await expect(card.getByLabel('Plan name')).toBeFocused();
  await expect(card.getByLabel('Plan name')).toHaveAttribute('placeholder', "Mia's Inner Circle");
  await expect(page.getByText('0 of 3 done', { exact: true })).toBeVisible();
  // The plan editor is on this view, so its step has no forward arrow.
  await expect(page.getByRole('button', { name: 'Next: Design your membership' }).locator('svg')).toHaveCount(0);

  await card.getByLabel('Plan name').fill('Early Club');
  await expect(page.getByTestId('curator-plan-preview')).toContainText('Early Club');
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft saved. Publishing remains optional.');
  await expect(card.getByTestId('curator-plan-draft')).toContainText('Early Club');
  expect(state.curatorProfile?.status).toBe('active');
  await expect(page.getByText('1 of 3 done', { exact: true })).toBeVisible();
  // Payout setup is on another view, so this step keeps its forward arrow.
  await expect(page.getByRole('button', { name: 'Next: Set up payouts' }).locator('svg')).toHaveCount(1);
  await expect(page.getByTestId('curator-plan-preview')).toContainText('Early Club');

  // Back on Music, the setup under way leads with its next step, and the invitation is gone.
  await page.reload();
  await openStudioStep(page, 'studio-music');
  await expect(page.getByRole('heading', { name: 'Finish your membership' })).toBeVisible();
  await expect(page.getByText('1 of 3 steps done.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Set up payouts', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Earn from your music' })).toHaveCount(0);
  // No plan was published, so member counts were never requested.
  expect(state.curatorMemberStatsRequests).toEqual([]);
});

test('says so when the profile read after a first draft fails, and recovers on retry', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Plan name').fill('Early Club');
  // The draft saves, then every profile read (the card's own and the page's retries) fails.
  state.curatorProfileReadFailuresRemaining = 10;
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(page.getByText('Could not load your curator profile.')).toBeVisible({ timeout: 15_000 });
  expect(state.curatorPlanCreateRequests).toHaveLength(1);

  state.curatorProfileReadFailuresRemaining = 0;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(card.getByTestId('curator-plan-draft')).toContainText('Early Club');
  await expect(page.getByText('Could not load your curator profile.')).toHaveCount(0);
  // Retrying reads the profile again; it never saves the draft a second time.
  expect(state.curatorPlanCreateRequests).toHaveLength(1);
});

test('hands a user with no payout account to secure onboarding', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [ownPost],
  });
  await hostPayoutPage(page);

  await page.goto(STUDIO_PATH);

  const card = page.getByTestId('curator-payout-card');
  await expect(card).toContainText('Not started');
  // The handoff says what Stripe asks for and why.
  await expect(card).toContainText('Social Security number because Cassette sends you a 1099 tax form');
  await expect(page.getByRole('button', { name: 'Set up a membership' })).toBeEnabled();

  state.curatorPayoutOnboardingFailuresRemaining = 1;
  await openStudioStep(page, 'studio-payouts');
  await page.getByTestId('curator-payout-onboarding').click();
  await expect(card.getByRole('alert')).toBeVisible();

  await openStudioStep(page, 'studio-payouts');
  await page.getByTestId('curator-payout-onboarding').click();

  await expect(page).toHaveURL(PAYOUT_URL);
  expect(state.curatorPayoutOnboardingRequests).toBe(2);
});

test('refreshes capability truth after hosted onboarding returns', async ({ page }) => {
  const active = payoutAccount({
    onboardingStatus: 'active',
    transfersCapabilityStatus: 'active',
    capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
  });
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPayoutAccount: payoutAccount(),
    curatorPayoutRefreshAccount: active,
  });

  await page.goto(`${STUDIO_PAYOUTS_PATH}?payout=return`);

  await expect(page.getByTestId('curator-payout-notice')).toHaveText('Payout setup is complete.');
  await expect(page.getByTestId('curator-payout-card')).toContainText('Ready');
  // Without a draft, the next step is designing one.
  await expect(page.getByTestId('curator-payout-card').getByRole('button', { name: 'Design your membership' }))
    .toBeVisible();
  await expect(page).not.toHaveURL(/payout=/);
  // Exactly one provider-refresh read; ordinary reads by other cards are incidental.
  expect(state.curatorPayoutStatusRequests.filter(Boolean)).toEqual([true]);
  expect(state.curatorPayoutAccount).toEqual(active);
});

test('keeps the membership setup on payout setup until Stripe verifies the account', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [ownPost],
    curatorProfile,
    curatorPlans: [draftPlan],
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'restricted',
      transfersCapabilityStatus: 'restricted',
      requirementsDue: true,
    }),
  });

  await page.goto(STUDIO_PATH);

  // Studio opens on Music; the setup under way offers its next step there.
  await expect(page.getByTestId('studio-music-trigger')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('1 of 3 steps done.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Set up payouts', exact: true }).click();
  await expect(page).toHaveURL(STUDIO_PAYOUTS_PATH);
  await expect(page.getByTestId('studio-billing-trigger')).toHaveAttribute('aria-current', 'page');
  const payoutCard = page.getByTestId('curator-payout-card');
  await expect(payoutCard.getByText('Setup started').locator('..')).toContainText('Done');
  await expect(payoutCard.getByText('Publish and receive payouts').locator('..')).toContainText('Needs your information');
});

test('opens the plan editor on the Membership view before a profile exists', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-membership');
  await page.getByRole('button', { name: 'Next: Design your membership' }).click();

  await expect(page.getByTestId('studio-membership-trigger')).toHaveAttribute('aria-current', 'page');
  const card = page.getByTestId('curator-plan-card');
  await expect(card.getByLabel('Plan name')).toBeFocused();
  await card.getByLabel('Plan name').fill('Early Club');
  await expect(page.getByTestId('curator-plan-preview')).toContainText('$5.50/month');
  await expect(page.getByText(/free profile/i)).toHaveCount(0);
});

test('mints a new hosted link when the provider refresh URL returns', async ({ page }) => {
  const renewedUrl = `${PAYOUT_URL}-renewed`;
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPayoutAccount: payoutAccount(),
    curatorPayoutOnboardingUrl: renewedUrl,
  });
  await hostPayoutPage(page, renewedUrl);

  await page.goto(`${STUDIO_PAYOUTS_PATH}?payout=refresh`);
  await expect(page.getByText('Your secure payout setup link expired.')).toBeVisible();
  expect(state.curatorPayoutOnboardingRequests).toBe(0);

  await page.getByRole('button', { name: 'Open a new setup link' }).click();

  await expect(page).toHaveURL(renewedUrl);
  expect(state.curatorPayoutOnboardingRequests).toBe(1);
});

test('keeps plan drafts usable through restricted and failed payout status', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [ownPost],
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'restricted',
      transfersCapabilityStatus: 'restricted',
      requirementsDue: true,
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });

  await page.goto(STUDIO_PATH);

  const card = page.getByTestId('curator-payout-card');
  await expect(card).toContainText('Needs attention');
  await expect(card).toContainText('more information');

  state.curatorPayoutStatusFailuresRemaining = 10;
  await page.reload();
  await openStudioStep(page, 'studio-payouts');
  await expect(card.getByRole('alert')).toBeVisible({ timeout: 10_000 });

  await openStudioStep(page, 'studio-membership');
  await page.getByRole('button', { name: 'Next: Design your membership' }).click();
  const plan = page.getByTestId('curator-plan-card');
  await plan.getByLabel('Plan name').fill('Steady Club');
  await plan.getByRole('button', { name: 'Save draft' }).click();

  await expect(plan.getByTestId('curator-plan-draft')).toContainText('Steady Club');
  expect(state.curatorProfile?.status).toBe('active');
});

test('creates a free draft with policy economics before payouts', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');

  const card = page.getByTestId('curator-plan-card');
  await expect(card.getByRole('heading', { name: 'Fan membership plan' })).toBeVisible();
  await expect(card.getByLabel('Monthly price (USD)')).toHaveValue('5.00');
  await card.getByLabel('Monthly price (USD)').fill('7');
  await card.getByLabel('Annual price (USD, optional)').fill('70');
  await expect(card.getByText('$7.58', { exact: true })).toBeVisible();
  await expect(card.getByText('$6.19', { exact: true })).toBeVisible();
  await expect(card.getByText('$73.10', { exact: true })).toBeVisible();
  await expect(card.getByText('Platform fee on fan payments', { exact: true }).locator('..')).toContainText('10%');
  await expect(card).not.toContainText('Curator Pro');

  await card.getByLabel('Plan name').fill('Selector Club');
  await card.getByLabel('Description').fill('Member-only selections.');
  // A new draft includes member-only posts unless the curator clears it.
  await expect(card.getByLabel(/Member-only posts/)).toBeChecked();
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft saved. Publishing remains optional.');
  const draft = card.getByTestId('curator-plan-draft');
  await expect(draft).toContainText('Selector Club');
  await expect(page.getByTestId('curator-plan-preview')).toContainText('$7.58/month');
  await expect(page.getByTestId('curator-plan-preview')).toContainText('$73.10/year');
  await expect(page.getByTestId('curator-plan-preview')).toContainText('plus applicable tax');
  await expect(card.getByTestId('curator-plan-publish')).toBeDisabled();
  await expect(card.getByRole('link', { name: 'Start payout setup' })).toBeVisible();
  await expect(card).not.toContainText('Curator Pro');
  expect(state.curatorPlanCreateRequests).toEqual([{
    name: 'Selector Club',
    description: 'Member-only selections.',
    amountMinor: 700,
    annualAmountMinor: 7000,
    featureKeys: ['member_posts'],
  }]);
  await expect(page.getByTestId('curator-payout-onboarding')).toBeEnabled();
});

test('starts a new draft without member-only posts when the catalog does not offer them', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorFeatures: [{
      featureKey: 'member_badge',
      displayName: 'Member badge',
      description: 'Show member identity on comments and likes.',
    }],
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Plan name').fill('Badge Club');
  await expect(card.getByLabel(/Member-only posts/)).toHaveCount(0);
  await expect(card.getByLabel(/Member badge/)).not.toBeChecked();
  await card.getByLabel(/Member badge/).check();
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft saved. Publishing remains optional.');
  expect(state.curatorPlanCreateRequests.map((request) => request.featureKeys)).toEqual([['member_badge']]);
});

test('keeps member-only posts cleared when the curator unchecks the default', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  const memberPosts = card.getByLabel(/Member-only posts/);
  await expect(memberPosts).toBeChecked();
  await memberPosts.uncheck();
  await card.getByLabel('Plan name').fill('Open Club');
  await expect(memberPosts).not.toBeChecked();
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft saved. Publishing remains optional.');
  expect(state.curatorPlanCreateRequests.map((request) => request.featureKeys)).toEqual([[]]);
});

test('refuses to publish a draft with no features and says features freeze at publish', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [{ ...draftPlan, featureKeys: [] }],
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'active',
      transfersCapabilityStatus: 'active',
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  const publish = card.getByTestId('curator-plan-publish');
  await expect(publish).toBeDisabled();
  await expect(publish).toHaveAccessibleDescription(
    'Features and fan prices freeze when you publish. Edit the draft to include at least one feature before you publish.',
  );
  await publish.click({ force: true });
  expect(state.curatorPlanPublishRequests).toEqual([]);

  await card.getByTestId('curator-plan-edit').click();
  await card.getByLabel(/Member-only posts/).check();
  await card.getByRole('button', { name: 'Save changes' }).click();
  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft updated.');

  await expect(publish).toBeEnabled();
  await expect(card.getByText('Edit the draft to include at least one feature before you publish.')).toHaveCount(0);
  await publish.click();
  await expect(card.getByTestId('curator-plan-active')).toContainText('Member-only posts');
  expect(state.curatorPlanPublishRequests).toEqual([draftPlan.id]);
});

test('a publish that answers after the person moved to Music does not pull them back', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [draftPlan],
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'active',
      transfersCapabilityStatus: 'active',
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });
  let release = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/curators/plans/*/publish', async (route) => {
    await released;
    await route.fallback().catch(() => {});
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const publish = page.getByTestId('curator-plan-card').getByTestId('curator-plan-publish');
  await expect(publish).toBeEnabled();
  await publish.click();
  await page.getByTestId('studio-music-trigger').click();
  await expect(page).toHaveURL('/studio/music');
  release();

  await expect.poll(() => state.curatorPlanPublishRequests).toEqual([draftPlan.id]);
  // The hidden plan card's notice is set in the same success handler that used to reopen
  // Membership; once it shows, any such navigation has started and lands well within a second.
  await expect(page.getByTestId('curator-plan-notice')).toHaveText("You're live. Fans can join from your public page.");
  const reopened = await page.waitForURL('**/studio/membership', { timeout: 1_000 }).then(() => true, () => false);
  expect(reopened).toBe(false);
  await expect(page).toHaveURL('/studio/music');
});

test('edits and deletes drafts before publication', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [draftPlan],
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByTestId('curator-plan-edit').click();

  await expect(card.getByLabel('Plan name')).toHaveValue('First Draft');
  await expect(card.getByLabel('Monthly price (USD)')).toHaveValue('5.00');
  await card.getByLabel('Plan name').fill('Second Draft');
  await card.getByLabel('Monthly price (USD)').fill('8');
  await card.getByLabel(/Member-only posts/).check();
  await card.getByRole('button', { name: 'Save changes' }).click();

  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft updated.');
  await expect(card.getByTestId('curator-plan-draft')).toContainText('Second Draft');
  await expect(card.getByTestId('curator-plan-draft')).toContainText('$8.00');
  expect(state.curatorPlanUpdateRequests).toEqual([{
    name: 'Second Draft',
    description: 'Weekly picks.',
    amountMinor: 800,
    annualAmountMinor: null,
    featureKeys: ['member_posts'],
  }]);

  await card.getByTestId('curator-plan-edit').click();
  await card.getByLabel('Plan name').fill('Abandoned change');
  await card.getByRole('button', { name: 'Cancel edit' }).click();
  await expect(card.getByTestId('curator-plan-draft')).toContainText('Second Draft');
  expect(state.curatorPlanUpdateRequests).toHaveLength(1);

  await card.getByTestId('curator-plan-delete').click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('no fan has joined it');
  await dialog.getByRole('button', { name: 'Delete draft' }).click();

  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft deleted.');
  await expect(card.getByTestId('curator-plan-draft')).toHaveCount(0);
  expect(state.curatorPlanDeleteRequests).toEqual(['mpl_FixtureStudioDraft01']);
});

// The form folds away without losing input: the fields, the pass in the rail, and
// the saved request all read the same draft, for a saved draft and a new one.
test('keeps draft input across folding the form and saves what the pass shows', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [draftPlan],
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  const pass = page.getByTestId('curator-plan-preview');
  const disclosure = card.getByRole('button', { name: /^(Create a draft|Edit draft: )/ });
  const foldAndReopen = async () => {
    await disclosure.click();
    await expect(card.getByLabel('Plan name')).toHaveCount(0);
    await disclosure.click();
  };

  await card.getByTestId('curator-plan-edit').click();
  await card.getByLabel('Plan name').fill('Second Draft');
  await card.getByLabel(/Member-only posts/).check();
  await foldAndReopen();
  await expect(card.getByLabel('Plan name')).toHaveValue('Second Draft');
  await expect(card.getByLabel('Description')).toHaveValue('Weekly picks.');
  await expect(card.getByLabel(/Member-only posts/)).toBeChecked();
  await expect(pass).toContainText('Second Draft');
  await expect(pass).toContainText('Member-only posts');
  await card.getByRole('button', { name: 'Save changes' }).click();
  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft updated.');
  expect(state.curatorPlanUpdateRequests).toEqual([{
    name: 'Second Draft',
    description: 'Weekly picks.',
    amountMinor: 500,
    annualAmountMinor: null,
    featureKeys: ['member_posts'],
  }]);

  await disclosure.click();
  await expect(card.getByLabel('Plan name')).toHaveValue('');
  await card.getByLabel('Plan name').fill('Night Shift');
  await card.getByLabel('Description').fill('Late picks.');
  await card.getByLabel('Monthly price (USD)').fill('9');
  await card.getByLabel(/Member-only posts/).check();
  await foldAndReopen();
  await expect(card.getByLabel('Plan name')).toHaveValue('Night Shift');
  await expect(card.getByLabel('Description')).toHaveValue('Late picks.');
  await expect(card.getByLabel('Monthly price (USD)')).toHaveValue('9');
  await expect(card.getByLabel(/Member-only posts/)).toBeChecked();
  await expect(pass).toContainText('Night Shift');
  await expect(pass).toContainText('Late picks.');
  await card.getByRole('button', { name: 'Save draft' }).click();
  await expect(card.getByTestId('curator-plan-notice')).toHaveText('Draft saved. Publishing remains optional.');
  expect(state.curatorPlanCreateRequests).toEqual([{
    name: 'Night Shift',
    description: 'Late picks.',
    amountMinor: 900,
    annualAmountMinor: null,
    featureKeys: ['member_posts'],
  }]);
});

test('publishes without Curator Pro after payout onboarding completes and archives without canceling subscriptions', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'active',
      transfersCapabilityStatus: 'active',
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Plan name').fill('Ready Plan');
  await card.getByLabel('Monthly price (USD)').fill('7');
  await card.getByRole('button', { name: 'Save draft' }).click();

  const publish = card.getByTestId('curator-plan-publish');
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(card.getByTestId('curator-plan-active')).toContainText('$7.58 (frozen)');
  expect(state.curatorPlanPublishRequests).toEqual(['mpl_FixtureStudioPlan01']);
  // The first publish confirms the plan is live with the page fans join from.
  await expect(card.getByTestId('curator-plan-notice')).toHaveText("You're live. Fans can join from your public page.");
  await expect(card.getByRole('link', { name: /\/profile\/miagroove$/ })).toHaveAttribute('href', '/profile/miagroove');
  await expect(card.getByRole('button', { name: 'Copy page link' })).toBeVisible();
  // The member figures replace the setup steps above the card, so focus returns to the card.
  await expect(card).toBeFocused();

  await card.getByRole('button', { name: 'Archive plan' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('keep their current price, access, and renewals');
  await dialog.getByRole('button', { name: 'Archive plan' }).click();

  await expect(card.getByTestId('curator-plan-archived')).toContainText('Ready Plan');
  await expect(card.getByTestId('curator-plan-notice')).toContainText('existing members keep their price, access, and renewals');
  expect(state.curatorPlanArchiveRequests).toEqual(['mpl_FixtureStudioPlan01']);
});

test('ends memberships after a confirmation that states the effect on members', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [{
      ...draftPlan,
      status: 'active',
      serviceFeeMinor: 45,
      publishedAtUtc: '2026-08-16T13:00:00Z',
    }],
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'active',
      transfersCapabilityStatus: 'active',
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
    curatorMemberCounts: { ...fixtureCuratorMemberCounts, notRenewingMembers: 0 },
  });

  await page.goto(STUDIO_PATH);
  await expect.poll(() => state.curatorMemberStatsRequests).toEqual([30]);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  // A live plan folds the card to a summary; open the tools first.
  await card.getByRole('button', { name: 'Manage plan' }).click();
  const endMemberships = card.getByRole('button', { name: 'End memberships' });
  await endMemberships.click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Each current member keeps access until the end of the period they already paid for');
  await expect(dialog).toContainText('not charged again');
  await expect(dialog).toContainText('one email with their end date');
  await dialog.getByRole('button', { name: 'Keep memberships' }).click();
  expect(state.curatorPlanEndMembershipsRequests).toEqual([]);

  await endMemberships.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'End memberships' }).click();

  await expect(card.getByTestId('curator-plan-archived')).toContainText('First Draft');
  await expect(card.getByTestId('curator-plan-notice')).toContainText('each member keeps access through the period they paid for');
  expect(state.curatorPlanEndMembershipsRequests).toEqual([draftPlan.id]);
  expect(state.curatorPlanArchiveRequests).toEqual([]);

  // The always-mounted Members tab reads its counts again after the ending.
  await expect.poll(() => state.curatorMemberStatsRequests).toEqual([30, 30]);
  await openStudioStep(page, 'studio-members');
  await expect(page.getByTestId('curator-earnings-card').getByText('3 members will not renew.', { exact: true }))
    .toBeVisible();
});

const publishedMonthlyPlan: CuratorPlan = {
  ...draftPlan,
  id: 'mpl_FixtureStudioPlan01',
  name: 'Monthly Club',
  amountMinor: 700,
  serviceFeeMinor: 58,
  status: 'active',
  publishedAtUtc: '2026-08-16T13:00:00Z',
};

test('adds a one-time annual price to a published plan after the server confirms it', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPayoutAccount: payoutAccount(),
    curatorPlans: [publishedMonthlyPlan],
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByRole('button', { name: 'Manage plan' }).click();
  await card.getByTestId('curator-plan-annual-open').click();

  const form = card.getByTestId('curator-plan-annual-form');
  await form.getByLabel('Annual price (USD)').fill('0.001');
  await expect(form).toContainText('Enter a valid annual price.');
  await expect(form.getByRole('button', { name: 'Add annual price' })).toBeDisabled();
  await form.getByLabel('Annual price (USD)').fill('100');
  await expect(form).toContainText('Annual price can be at most 12 monthly payments.');
  await expect(form.getByRole('button', { name: 'Add annual price' })).toBeDisabled();
  await form.getByLabel('Annual price (USD)').fill('60');

  // Bridge rejects the addition while the profile is inactive; its copy reaches the curator.
  state.curatorProfile = { ...curatorProfile, status: 'suspended' };
  await form.getByRole('button', { name: 'Add annual price' }).click();
  await expect(form.getByRole('alert')).toHaveText('Adding annual pricing requires an active curator profile.');
  expect(state.curatorPlans[0].annualAmountMinor).toBeNull();

  state.curatorProfile = curatorProfile;
  await form.getByRole('button', { name: 'Add annual price' }).click();
  await expect(card.getByTestId('curator-plan-notice')).toContainText('Annual price added.');
  await expect(card.getByTestId('curator-plan-active')).toContainText('$62.70 (frozen)');
  await expect(card.getByTestId('curator-plan-annual-open')).toHaveCount(0);
  await expect(form).toHaveCount(0);
  expect(state.curatorPlanAnnualPriceRequests).toEqual([
    { planId: 'mpl_FixtureStudioPlan01', annualAmountMinor: 6000 },
    { planId: 'mpl_FixtureStudioPlan01', annualAmountMinor: 6000 },
  ]);
});

test('omits the annual fan estimate even when today\'s policy gives the plan\'s frozen monthly fee', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPayoutAccount: payoutAccount(),
    // Today's policy also gives 58 on 700, but the plan's frozen schedule can still price a year differently.
    curatorPlans: [publishedMonthlyPlan],
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByRole('button', { name: 'Manage plan' }).click();
  await card.getByTestId('curator-plan-annual-open').click();
  const form = card.getByTestId('curator-plan-annual-form');
  await form.getByLabel('Annual price (USD)').fill('60');
  await expect(form).toContainText('Fan fees follow this plan\'s original terms.');
  await expect(form.getByText('Fan pays')).toHaveCount(0);
  await form.getByRole('button', { name: 'Cancel' }).click();
  await expect(card.getByTestId('curator-plan-annual-open')).toBeFocused();
});

test('keeps an archive result when the annual price refresh was sent before it', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPayoutAccount: payoutAccount(),
    curatorPlans: [publishedMonthlyPlan],
  });
  // Hold the plan list read that follows the annual price, answering later with the plans it saw.
  let markListReadHeld = () => {};
  const listReadHeld = new Promise<void>((resolve) => { markListReadHeld = resolve; });
  let answerListRead = () => {};
  await page.route('**/api/v1/curators/plans', (route) => {
    if (route.request().method() !== 'GET' || state.curatorPlanAnnualPriceRequests.length === 0) return route.fallback();
    const plansWhenSent = structuredClone(state.curatorPlans);
    markListReadHeld();
    return new Promise<void>((resolve) => { answerListRead = resolve; })
      // The page cancels this read, so the late answer may have no request to reach.
      .then(() => route.fulfill({ json: plansWhenSent }).catch(() => undefined));
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByRole('button', { name: 'Manage plan' }).click();
  await card.getByTestId('curator-plan-annual-open').click();
  const form = card.getByTestId('curator-plan-annual-form');
  await form.getByLabel('Annual price (USD)').fill('60');
  await form.getByRole('button', { name: 'Add annual price' }).click();
  await expect(form.getByRole('button', { name: 'Adding…' })).toBeDisabled();
  await listReadHeld;

  const listReadCancelled = page.waitForEvent('requestfailed', (request) =>
    new URL(request.url()).pathname === '/api/v1/curators/plans');
  await card.getByRole('button', { name: 'Archive plan' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archive plan' }).click();
  await listReadCancelled;
  answerListRead();
  await expect(card.getByTestId('curator-plan-archived')).toContainText('Monthly Club');
  await expect(card.getByTestId('curator-plan-active')).toHaveCount(0);
  await expect(card.getByTestId('curator-plan-notice')).toHaveText(/^Plan archived\./);
});

test('keeps the archive notice when the annual price response arrives after Archive', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPayoutAccount: payoutAccount(),
    curatorPlans: [publishedMonthlyPlan],
  });
  // The server saves the annual price at once; its response reaches the page only after Archive settles.
  let markAnnualSaved = () => {};
  const annualSaved = new Promise<void>((resolve) => { markAnnualSaved = resolve; });
  let answerAnnualPrice = () => {};
  await page.route('**/api/v1/curators/plans/*/annual-price', (route) => {
    const saved = structuredClone(Object.assign(state.curatorPlans[0], { annualAmountMinor: 6000, annualServiceFeeMinor: 270 }));
    markAnnualSaved();
    return new Promise<void>((resolve) => { answerAnnualPrice = resolve; }).then(() => route.fulfill({ json: saved }));
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByRole('button', { name: 'Manage plan' }).click();
  await card.getByTestId('curator-plan-annual-open').click();
  const form = card.getByTestId('curator-plan-annual-form');
  await form.getByLabel('Annual price (USD)').fill('60');
  await form.getByRole('button', { name: 'Add annual price' }).click();
  await annualSaved;
  await card.getByRole('button', { name: 'Archive plan' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Archive plan' }).click();
  await expect(card.getByTestId('curator-plan-archived')).toContainText('$62.70 (frozen)');

  const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/v1/curators/plans');
  answerAnnualPrice();
  await refreshed;
  // Nothing visible marks the late success callback, so allow it to run before the check.
  await page.waitForTimeout(500);
  await expect(card.getByTestId('curator-plan-notice')).toHaveText(/^Plan archived\./);
});

test('does not publish a suspended profile', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile: {
      ...curatorProfile,
      status: 'suspended',
      suspensionReason: 'Payout account ownership requires review.',
    },
    curatorPayoutAccount: payoutAccount({
      onboardingStatus: 'active',
      transfersCapabilityStatus: 'active',
      capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
    }),
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Plan name').fill('Suspended Plan');
  await card.getByRole('button', { name: 'Save draft' }).click();

  await expect(card.getByTestId('curator-plan-publish')).toBeDisabled();
  expect(state.curatorPlanPublishRequests).toEqual([]);
});

test('uses server-provided curator-borne processing in the estimate', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPricing: curatorBornePricing,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');
  const card = page.getByTestId('curator-plan-card');
  await card.getByLabel('Monthly price (USD)').fill('7');

  await expect(card.getByText('Payment processing', { exact: true }).locator('..')).toContainText('−$0.55');
  await expect(card.getByText('Estimated earnings per member', { exact: true }).locator('..')).toContainText('$5.75');
  await expect(card).toContainText(
    'monthly, after your balance reaches $10.00. Smaller cleared balances are paid after 90 days.',
  );
});

test('isolates plan-tool failures from payout controls and recovers before a profile exists', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorPlanToolsStatus: 503,
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-plan');

  const card = page.getByTestId('curator-plan-card');
  await expect(card.getByRole('alert')).toContainText(
    'Your payout controls still work.',
    { timeout: 10_000 },
  );
  await expect(page.getByTestId('curator-payout-onboarding')).toBeEnabled();

  // Retrying must not read the plan list, which has no profile to answer for yet.
  state.curatorPlanToolsStatus = 200;
  await card.getByRole('button', { name: 'Try again' }).click();
  await expect(card.getByLabel('Plan name')).toBeVisible();
  await expect(card.getByRole('alert')).toHaveCount(0);
});

test('shows private paginated earnings without Curator Pro', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    // Published once, then archived: the members and their earnings stay, with no live offer.
    curatorPlans: [{ ...publishedMonthlyPlan, status: 'archived', archivedAtUtc: '2026-08-20T12:00:00Z' }],
    curatorEarnings: {
      activeMemberCount: 3, items: earningsItems,
      balances: { currency: 'USD', earnedThisMonth: 0, accrued: 2053, payable: 0,
        blocked: 0, paidOut: 900, nextPayableAt: null },
    },
  });
  const firstPageResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/v1/curators/me/earnings' && url.searchParams.get('page') === '1';
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-members');

  const card = page.getByTestId('curator-earnings-card');
  await expect(card).toBeVisible();

  const terminalAllocation = card.getByText('$1.25', { exact: true }).locator('..').locator('..');
  await expect(terminalAllocation).toContainText('Earning forfeited');
  await expect(terminalAllocation).toContainText('Not earned');
  await expect(terminalAllocation).not.toContainText('Payout eligibility');
  await expect(card.getByText('$4.25', { exact: true }).locator('..').locator('..')).toContainText(
    'Payout eligibility',
  );
  const transfer = card.getByText('$9.00', { exact: true }).locator('..').locator('..');
  await expect(transfer).toContainText('Payout sent');
  await expect(transfer).toContainText('Paid');

  const responseText = JSON.stringify(await (await firstPageResponse).json());
  expect(responseText).not.toMatch(
    /sourceRef|stripe|failureDetail|reversalReason|fanUserId|membershipSubscriptionId/i,
  );

  await card.getByRole('button', { name: 'Next' }).click();
  await expect(card.getByText(/Page 2/)).toBeVisible();
  await expect(card.getByText('$2.07', { exact: true })).toBeVisible();
  // The members card pages by ten; the earnings hero above it reads its own window.
  expect(state.curatorEarningsRequests.filter((request) => request.pageSize === 10)).toEqual([
    { page: 1, pageSize: 10 },
    { page: 2, pageSize: 10 },
  ]);
});

test('shows member counts, the daily trend, and the previous-window baseline', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorMemberCounts: fixtureCuratorMemberCounts,
    // Three different counts prove which source each place reads.
    curatorAudience: { audienceCount: 9, activeMemberCount: 5 },
    curatorEarnings: {
      activeMemberCount: 7, items: earningsItems.slice(0, 3),
      balances: { currency: 'USD', earnedThisMonth: 0, accrued: 425, payable: 0,
        blocked: 0, paidOut: 900, nextPayableAt: null },
    },
  });
  const firstResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/v1/curators/me/member-stats');

  await page.goto(STUDIO_PATH);
  // The rail reads the audience; the members card reads member counts. Neither shows the ledger's status count.
  await openStudioStep(page, 'studio-music');
  await expect(page.getByRole('button', { name: 'Members 5', exact: true })).toBeVisible();
  // The hidden Membership view keeps its own historical "Active members" figure.
  await expect(page.getByText('Active members', { exact: true }).filter({ visible: true })).toHaveCount(0);
  await openStudioStep(page, 'studio-members');

  const card = page.getByTestId('curator-earnings-card');
  await expect(card.getByTestId('curator-active-member-count')).toHaveText('3');
  await expect(card.getByTestId('curator-new-member-count')).toHaveText('2');
  await expect(card.getByTestId('curator-ended-member-count')).toHaveText('1');
  await expect(card.getByText(/^\+1 since /)).toBeVisible();
  await expect(card.getByText('1 in the 30 days before', { exact: true })).toBeVisible();
  await expect(card.getByText('0 in the 30 days before', { exact: true })).toBeVisible();
  await expect(card.getByText('1 member will not renew.', { exact: true })).toBeVisible();
  await expect(card.getByText(
    'A membership counts as ended on the day its access ends, not the day the fan cancels.',
    { exact: true },
  )).toBeVisible();
  await expect(card.getByRole('figure')).toBeVisible();
  // The earnings card above it owns earnings figures.
  await expect(card).not.toContainText('Earned this month');

  const responseText = JSON.stringify(await (await firstResponse).json());
  expect(responseText).not.toMatch(/fanUserId|membershipSubscriptionId|email|username|stripe/i);

  // Hold the 7-day response: the 30-day figures stay on screen, dimmed and busy.
  let releaseWeek!: () => void;
  const weekHeld = new Promise<void>((resolve) => { releaseWeek = resolve; });
  await page.route(
    (url) => url.pathname === '/api/v1/curators/me/member-stats' && url.searchParams.get('days') === '7',
    async (route) => {
      await weekHeld;
      await route.fallback();
    },
  );
  await card.getByRole('radio', { name: '7 days' }).click();
  await expect(card.getByText('Loading 7 days…', { exact: true })).toBeVisible();
  await expect(card.locator('[aria-busy="true"]')).toBeVisible();
  await expect(card.getByText('1 in the 30 days before', { exact: true })).toBeVisible();

  releaseWeek();
  await expect(card.getByText('1 in the 7 days before', { exact: true })).toBeVisible();
  await expect(card.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(card.getByText('Loading 7 days…', { exact: true })).toHaveCount(0);
  expect(state.curatorMemberStatsRequests).toEqual([30, 7]);
});

test('says when a published plan has no members in the window', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-members');

  const card = page.getByTestId('curator-earnings-card');
  await expect(card.getByText('No active members', { exact: true })).toBeVisible();
  await expect(card.getByText('No one joined or left in the last 60 days.', { exact: true })).toBeVisible();
  await expect(card.getByRole('link', { name: 'View your public profile' })).toBeVisible();
  await expect(card.getByTestId('curator-active-member-count')).toHaveCount(0);
  expect(state.curatorMemberStatsRequests).toEqual([30]);
});

test('leaves the plan card to explain a failed plan read, with no members or setup steps', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
  });
  await page.route('**/api/v1/curators/plans', (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"unavailable"}' }));

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-membership');

  await expect(page.getByTestId('curator-plan-card').getByRole('alert')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('curator-earnings-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Membership setup' })).toHaveCount(0);
  expect(state.curatorMemberStatsRequests).toEqual([]);
});

test('keeps the activity list when member counts fail, then retries them', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
    curatorMemberStatsStatus: 503,
    curatorEarnings: {
      activeMemberCount: 3, items: earningsItems.slice(0, 3),
      balances: { currency: 'USD', earnedThisMonth: 0, accrued: 425, payable: 0,
        blocked: 0, paidOut: 900, nextPayableAt: null },
    },
  });

  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-members');

  const card = page.getByTestId('curator-earnings-card');
  await expect(card.getByRole('alert')).toContainText('Your other Studio tools still work.', { timeout: 10_000 });
  await expect(card.getByTestId('curator-earnings-history')).toBeVisible();

  state.curatorMemberStatsStatus = 200;
  state.curatorMemberCounts = fixtureCuratorMemberCounts;
  await card.getByRole('button', { name: 'Try again' }).click();
  await expect(card.getByTestId('curator-active-member-count')).toHaveText('3');
});


test('shows old outstanding balances even when the chart window is fully loaded', async ({ page }) => {
  const oldDate = new Date();
  oldDate.setUTCFullYear(oldDate.getUTCFullYear() - 2);
  const oldItems: CuratorEarningsHistoryItem[] = Array.from({ length: 51 }, () => ({
    kind: 'allocation', amountMinor: 1000, currency: 'USD', status: 'blocked',
    occurredAtUtc: oldDate.toISOString(), payableAtUtc: oldDate.toISOString(),
  }));
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPayoutAccount: payoutAccount({ onboardingStatus: 'active', transfersCapabilityStatus: 'active' }),
    curatorEarnings: {
      activeMemberCount: 0, items: oldItems,
      balances: { currency: 'USD', earnedThisMonth: 0, accrued: 0, payable: 0,
        blocked: 51000, paidOut: 0, nextPayableAt: null },
    },
  });
  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-payouts');
  const history = page.locator('#studio-payout-history');
  await expect(history.getByText('On hold', { exact: true }).locator('..')).toContainText('$510.00');
  expect(state.curatorEarningsRequests.some((request) => request.page === 2)).toBe(false);
});


test('opens Stripe for payout updates after onboarding is complete', async ({ page }) => {
  await hostPayoutPage(page);
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPayoutAccount: payoutAccount({ onboardingStatus: 'active', transfersCapabilityStatus: 'active' }),
    curatorPayoutOnboardingUrl: PAYOUT_URL,
  });
  await page.goto(STUDIO_PATH);
  await openStudioStep(page, 'studio-payouts');
  await page.getByRole('button', { name: 'Update payout details' }).click();
  await expect(page).toHaveURL(PAYOUT_URL);
  expect(state.curatorPayoutOnboardingRequests).toBe(1);
});

/** Payouts & billing sections from top to bottom; null until all three are laid out, so order is never inferred from a missing box. */
async function billingOrder(page: Page) {
  const sections = {
    setup: page.getByTestId('curator-payout-card'),
    history: page.locator('#studio-payout-history'),
    pro: page.getByTestId('curator-pro-card'),
  };
  const placed: Array<{ name: string; y: number }> = [];
  for (const [name, section] of Object.entries(sections)) {
    const box = await section.boundingBox();
    if (!box) return null;
    placed.push({ name, y: box.y });
  }
  return placed.sort((a, b) => a.y - b.y).map((entry) => entry.name);
}

const restrictedPayout = payoutAccount({
  onboardingStatus: 'restricted',
  transfersCapabilityStatus: 'restricted',
  requirementsDue: true,
});
const activePayout = payoutAccount({
  onboardingStatus: 'active',
  transfersCapabilityStatus: 'active',
  capabilityCheckedAtUtc: '2026-08-16T12:00:00Z',
});

test('shows one banner after the first publish and orders billing by payout state', async ({ page }) => {
  // No posts: payout recovery for a live plan still comes before the first music step.
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [publishedMonthlyPlan],
    curatorPayoutAccount: restrictedPayout,
    curatorProStatus: fixtureCuratorProAvailableStatus,
  });

  await page.goto(STUDIO_PATH);
  await expect(page.getByTestId('studio-music-trigger')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Payout setup is not complete.')).toBeVisible();
  await expect(page.getByText('Your page has no music yet.')).toHaveCount(0);
  await openStudioStep(page, 'studio-membership');
  await page.getByRole('button', { name: /^Ready to pay out/ }).click();
  await expect(page.getByTestId('studio-billing-trigger')).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => billingOrder(page)).toEqual(['setup', 'history', 'pro']);

  state.curatorPayoutAccount = activePayout;
  await page.reload();
  await openStudioStep(page, 'studio-membership');
  await expect(page.getByRole('heading', { name: 'Earned' })).toBeVisible();
  await openStudioStep(page, 'studio-music');
  await expect(page.getByText('Payout setup is not complete.')).toHaveCount(0);
  // With payouts ready, the empty music list asks for the first music, and no banner repeats it.
  await expect(page.getByRole('link', { name: 'Add your first music' }))
    .toHaveAttribute('href', '/studio/music/new?from=%2Fstudio%2Fmusic');
  await expect(page.getByText('Your page has no music yet.')).toHaveCount(0);
  await expect(page.getByText('Copy your page link to share it with fans.')).toHaveCount(0);
  await openStudioStep(page, 'studio-billing');
  await expect(page.getByTestId('curator-payout-card')).toContainText('Ready. Last checked');
  await expect.poll(() => billingOrder(page)).toEqual(['history', 'setup', 'pro']);
});

test('keeps payout setup first after a payout return and offers the next plan step', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [draftPlan],
    curatorPayoutAccount: payoutAccount(),
    curatorPayoutRefreshAccount: activePayout,
    curatorProStatus: fixtureCuratorProAvailableStatus,
  });

  await page.goto(`${STUDIO_PAYOUTS_PATH}?payout=return`);

  await expect(page.getByTestId('curator-payout-notice')).toHaveText('Payout setup is complete.');
  // Setup stays first for this visit, so the notice does not move when payouts turn active.
  await expect.poll(() => billingOrder(page)).toEqual(['setup', 'history', 'pro']);
  expect(state.curatorPayoutStatusRequests.filter(Boolean)).toEqual([true]);

  await page.getByTestId('curator-payout-card').getByRole('button', { name: 'Publish your plan' }).click();
  await expect(page.getByTestId('studio-membership-trigger')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('curator-plan-card')).toBeFocused();
  await expect(page.getByTestId('curator-plan-publish')).toBeEnabled();
});

test('ends with the share banner for a live curator with music, and copying the link finishes it', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    // A fresh members-only post: no members-only nudge, so sharing is the open step.
    posts: [ownPost, { ...ownPost, postId: 'post-studio-members-fresh', privacy: 'subscriber', createdAt: new Date().toISOString() }],
    curatorProfile,
    curatorPlans: [publishedMonthlyPlan],
    curatorPayoutAccount: activePayout,
  });
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto(STUDIO_PATH);
  await expect(page.getByText('Copy your page link to share it with fans.')).toBeVisible();
  await page.getByRole('button', { name: 'Copy page link' }).click();
  await expect(page.getByText('Copy your page link to share it with fans.')).toHaveCount(0);
});

test('shows no setup banner while the payout state is unknown', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorProfile,
    curatorPlans: [publishedMonthlyPlan],
    curatorPayoutAccount: restrictedPayout,
  });
  state.curatorPayoutStatusFailuresRemaining = 10;

  await page.goto(STUDIO_PATH);
  // The payout card stays mounted, hidden, on the Music URL; its read failure settles there.
  await expect(page.getByTestId('curator-payout-card').locator('[role="alert"]')).toBeAttached({ timeout: 10_000 });
  await expect(page.getByTestId('studio-music-trigger')).toHaveAttribute('aria-current', 'page');
  // The hidden Membership view has the earnings, so the published plan has been read.
  await expect(page.locator('#studio-earned-title')).toBeAttached();
  await expect(page.getByText('Payout setup is not complete.')).toHaveCount(0);
});

test.describe('audience', () => {
  const audienceSection = (page: Page) => page.getByRole('region', { name: 'Audience' });

  test('a free curator with no plan and no Curator Pro sees the audience and its definition', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorProfile,
      curatorAudience: { audienceCount: 4, activeMemberCount: 0 },
    });

    await page.goto(STUDIO_PATH);

    const section = audienceSection(page);
    await expect(section.getByText('Audience', { exact: true })).toBeVisible();
    await expect(section).toContainText('4');
    await expect(section.getByRole('button', { name: 'Members 0', exact: true })).toBeVisible();
    await expect(section).toContainText('Followers and members');
    await expect(section).toContainText('Each person counts once. Only you see these numbers.');
    // No published plan: the music leads, and the audience still shows.
    await expect(page.getByRole('heading', { name: 'Music', exact: true })).toBeVisible();
    expect(state.curatorAudienceRequests).toBeGreaterThan(0);

    // There are no member figures before a publish, so Members opens the setup steps and focus follows.
    await section.getByRole('button', { name: 'Members 0', exact: true }).click();
    await expect(page).toHaveURL(/\/studio\/membership$/);
    await expect(page.locator('#studio-setup')).toBeFocused();
  });

  test('Members opens the plan card that explains a failed plan read', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorProfile,
      curatorAudience: { audienceCount: 4, activeMemberCount: 0 },
    });
    await page.route('**/api/v1/curators/plans', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"unavailable"}' }));

    await page.goto(STUDIO_PATH);
    // The hidden Membership view stays mounted: once its plan card shows the error, the read has
    // failed, Studio reads it as not published, and Membership shows no setup steps.
    await expect(page.getByTestId('curator-plan-card').getByRole('alert', { includeHidden: true }))
      .toBeAttached({ timeout: 15_000 });

    await audienceSection(page).getByRole('button', { name: 'Members 0', exact: true }).click();
    await expect(page).toHaveURL(/\/studio\/membership$/);
    await expect(page.locator('#studio-plan')).toBeFocused();
    await expect(page.getByTestId('curator-plan-card').getByRole('alert')).toBeVisible();
  });

  test('a curator with a published plan and Curator Pro sees the same private counts beside earnings', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorProfile,
      curatorPlans: [fixtureActiveMemberPostPlan],
      curatorProStatus: fixtureCuratorProActiveStatus,
      curatorAudience: { audienceCount: 12, activeMemberCount: 5 },
      curatorEarnings: {
        activeMemberCount: 7, items: earningsItems.slice(0, 3),
        balances: { currency: 'USD', earnedThisMonth: 0, accrued: 425, payable: 0,
          blocked: 0, paidOut: 900, nextPayableAt: null },
      },
    });

    await page.goto(STUDIO_PATH);
    await openStudioStep(page, 'studio-membership');

    await expect(page.getByRole('button', { name: 'Ready to pay out $0.00', exact: true })).toBeVisible();
    const section = audienceSection(page);
    await expect(section).toContainText('12');
    await expect(section.getByRole('button', { name: 'Members 5', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Active members/ })).toHaveCount(0);
    await section.getByRole('button', { name: 'Members 5', exact: true }).click();
    await expect(page.getByTestId('curator-earnings-card')).toBeVisible();
  });

  test('loading and failure never read as zero, and a retry recovers', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorProfile,
      curatorAudience: { audienceCount: 3, activeMemberCount: 1 },
      curatorAudienceStatus: 503,
    });
    let release = () => {};
    const released = new Promise<void>((resolve) => { release = resolve; });
    let holdFirst = true;
    await page.route('**/api/v1/curators/me/audience', async (route) => {
      if (holdFirst) {
        holdFirst = false;
        await released;
      }
      await route.fallback().catch(() => {});
    });

    await page.goto(STUDIO_PATH);
    const section = audienceSection(page);
    await expect(section.getByText('Loading…')).toHaveCount(2);
    await expect(section.getByText('0', { exact: true })).toHaveCount(0);

    release();
    await expect(section.getByText('Unavailable right now')).toHaveCount(2, { timeout: 15_000 });
    await expect(section.getByText('0', { exact: true })).toHaveCount(0);
    await expect(section.getByText('—')).toHaveCount(2);

    state.curatorAudienceStatus = 200;
    await section.getByRole('button', { name: 'Try again' }).click();
    await expect(section.getByRole('button', { name: 'Members 1', exact: true })).toBeVisible();
    await expect(section).toContainText('3');
    await expect(section.getByRole('button', { name: 'Try again' })).toHaveCount(0);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the audience fits the screen', async ({ page }) => {
      await mockCassetteApp(page, {
        currentUser: fixtureUsers.member,
        curatorProfile,
        curatorAudience: { audienceCount: 1234567, activeMemberCount: 89012 },
      });

      await page.goto(STUDIO_PATH);
      await expect(audienceSection(page).getByRole('button', { name: 'Members 89,012', exact: true })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
});
