import { expect, test } from '@playwright/test';
import {
  fixtureConvertTemplates,
  fixturePaidPromotionCampaign,
  fixturePaidPromotionRateCards,
  fixturePaidPromotionSubjects,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('renders the signed-in promoter home from owner-scoped campaign and subject responses', async ({
  page,
}) => {
  const requestedApiPaths: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes('paid-promotions')) requestedApiPaths.push(url.pathname);
  });
  const campaignRequestPromise = page.waitForRequest((request) =>
    request.method() === 'GET' &&
    new URL(request.url()).pathname === '/api/v1/paid-promotions/campaigns',
  );
  const subjectRequestPromise = page.waitForRequest((request) =>
    request.method() === 'GET' &&
    new URL(request.url()).pathname === '/api/v1/paid-promotions/subjects',
  );

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaigns: [fixturePaidPromotionCampaign],
    paidPromotionSubjects: fixturePaidPromotionSubjects,
  });

  await page.goto('/promote');
  const campaignRequest = await campaignRequestPromise;
  const subjectRequest = await subjectRequestPromise;

  await expect(page.getByRole('heading', { name: 'Promotion home' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your campaigns' })).toBeVisible();
  await expect(page.getByText('Signal Fire').first()).toBeVisible();
  await expect(page.getByText('Pending Payment')).toBeVisible();
  const subjectCatalog = page.locator(
    'section[aria-labelledby="promoted-subjects-heading"]',
  );
  await expect(subjectCatalog.getByText('Signal Fire')).toBeVisible();
  await expect(subjectCatalog.getByText('2 campaigns')).toBeVisible();
  await expect(subjectCatalog.getByText('In Review · 1')).toBeVisible();
  await expect(subjectCatalog.getByText('Completed · 1')).toBeVisible();
  await expect(page.getByTestId('paid-promotion-new-campaign')).toHaveAttribute(
    'href',
    '/promote/new',
  );
  await expect(page.getByText("Other owner's campaign")).toHaveCount(0);
  expect(new URL(campaignRequest.url()).search).toBe('');
  expect(new URL(subjectRequest.url()).search).toBe('');
  expect(requestedApiPaths.some((path) => path.includes('/internal/paid-promotions'))).toBe(false);

  await page.getByTestId(`paid-promotion-campaign-link-${fixturePaidPromotionCampaign.id}`).click();
  await expect(page).toHaveURL(`/promote/${fixturePaidPromotionCampaign.id}/return`);
  await expect(page.getByRole('heading', { name: 'Waiting for payment confirmation' })).toBeVisible();
});

test('shows promoter-home loading and empty states without inferring data', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaigns: [],
    paidPromotionSubjects: [],
    paidPromotionCampaignsDelayMs: 400,
    paidPromotionSubjectsDelayMs: 400,
  });

  await page.goto('/promote');
  await expect(page.getByText('Loading your campaigns…')).toBeVisible();
  await expect(page.getByText('Loading promoted tracks…')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No campaigns yet' })).toBeVisible();
  await expect(page.getByText('No promoted tracks yet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start your first campaign' })).toHaveAttribute(
    'href',
    '/promote/new',
  );
});

test('fails visibly for promoter-home request errors', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaignsStatus: 503,
    paidPromotionSubjectsStatus: 503,
  });

  await page.goto('/promote');
  await expect(page.getByText('Campaigns could not be shown.')).toBeVisible();
  await expect(page.getByText('Promoted tracks could not be shown.')).toBeVisible();
  await expect(page.getByText('Cassette is temporarily unavailable. Please try again.')).toHaveCount(2);
});

test('fails closed when owner campaign and subject access is forbidden', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaigns: [fixturePaidPromotionCampaign],
    paidPromotionCampaignsStatus: 403,
    paidPromotionSubjects: fixturePaidPromotionSubjects,
    paidPromotionSubjectsStatus: 403,
  });

  await page.goto('/promote');

  await expect(page.getByText("You don't have permission to do that.")).toHaveCount(2);
  await expect(page.getByTestId('paid-promotion-campaign-list')).toHaveCount(0);
  await expect(page.getByText('Signal Fire')).toHaveCount(0);
});

test('fails visibly for malformed promoter-home server collections', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaignsResponse: { campaigns: [] },
    paidPromotionSubjects: { subjects: [] },
  });
  await page.goto('/promote');

  await expect(page.getByText(
    'Cassette returned unrecognized paid-promotion data. No campaign details were inferred.',
  )).toHaveCount(2);
});

test('redirects anonymous promoter-home visitors through the existing auth return flow', async ({
  page,
}) => {
  await mockCassetteApp(page);

  await page.goto('/promote');

  await expect(page).toHaveURL('/auth/signin?redirect=/promote');
});

test('creates a server-priced paid-promotion campaign and trusts webhook-backed polling after return', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionPollSequence: [
      { status: 'pending_payment', paymentStatus: 'pending' },
      {
        status: 'in_review',
        paymentStatus: 'paid',
        discountAmountMinor: 5000,
        taxAmountMinor: 1500,
        finalTotalMinor: 21500,
        amountRefundedMinor: 0,
        refundableRemainderMinor: 21500,
      },
    ],
  });

  await page.goto('/promote/new');
  await expect(page.getByRole('button', { name: 'Promotion home', exact: true })).toBeVisible();
  await page.getByTestId('paid-promotion-track-input').fill(
    fixtureConvertTemplates.paidPromotionTrack.originalUrl,
  );
  await page.getByTestId('paid-promotion-resolve-track').click();

  const resolvedTrack = page.getByTestId('paid-promotion-resolved-track');
  await expect(resolvedTrack).toContainText('Signal Fire');
  await expect(resolvedTrack).toHaveAttribute('role', 'status');
  await expect(resolvedTrack).toBeFocused();
  await page.getByTestId(
    `paid-promotion-rate-card-${fixturePaidPromotionRateCards[0].id}`,
  ).click();
  await page.getByTestId('paid-promotion-brief').fill(
    'Focus on the release story and the live arrangement.',
  );
  await page.getByLabel('Promoter kind').click();
  await page.getByRole('option', { name: 'Artist', exact: true }).click();
  await page.getByLabel('Relationship to the artist').click();
  await page.getByRole('option', { name: 'I am the artist', exact: true }).click();
  await page.getByTestId('paid-promotion-attestation').check();

  const campaignRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname === '/api/v1/paid-promotions/campaigns',
  );
  const checkoutRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname.endsWith('/checkout-session'),
  );
  await page.getByTestId('paid-promotion-submit').click();
  const campaignRequest = await campaignRequestPromise;
  const checkoutRequest = await checkoutRequestPromise;
  const campaignPayload = campaignRequest.postDataJSON() as Record<string, unknown>;

  expect(campaignPayload.trackId).toBe(fixtureConvertTemplates.paidPromotionTrack.musicElementId);
  expect(campaignPayload.rateCardId).toBe(fixturePaidPromotionRateCards[0].id);
  expect(campaignPayload.attestationAccepted).toBe(true);
  expect(campaignPayload).not.toHaveProperty('amountMinor');
  expect(campaignPayload).not.toHaveProperty('currency');
  expect(campaignPayload).not.toHaveProperty('attestationVersion');
  expect(campaignPayload).not.toHaveProperty('price');
  expect(campaignPayload).not.toHaveProperty('couponId');
  expect(campaignPayload).not.toHaveProperty('promotionCodeId');
  expect(campaignPayload).not.toHaveProperty('finalTotalMinor');
  expect(checkoutRequest.postData()).toBeNull();

  await expect(page).toHaveURL(
    new RegExp(`/promote/${fixturePaidPromotionCampaign.id}/return\\?session_id=`),
  );
  await expect(page.getByRole('heading', { name: 'Waiting for payment confirmation' }))
    .toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
  await expect(page.getByText('Discount', { exact: true }).locator('..'))
    .toContainText('USD 50.00');
  await expect(page.getByText('Tax', { exact: true }).locator('..'))
    .toContainText('USD 15.00');
  await expect(page.getByText('Final total', { exact: true }).locator('..'))
    .toContainText('USD 215.00');
});

test('redirects anonymous new-campaign visitors through the existing auth return flow', async ({
  page,
}) => {
  await mockCassetteApp(page);

  await page.goto('/promote/new');

  await expect(page).toHaveURL('/auth/signin?redirect=/promote/new');
});

for (const expected of [
  { paymentStatus: 'processing', heading: 'Payment is processing' },
  { paymentStatus: 'failed', heading: 'Payment was not completed' },
  { paymentStatus: 'expired', heading: 'Checkout expired' },
] as const) {
  test(`renders the persisted ${expected.paymentStatus} return state`, async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      paidPromotionCampaign: {
        ...fixturePaidPromotionCampaign,
        paymentStatus: expected.paymentStatus,
      },
    });

    await page.goto(
      `/promote/${fixturePaidPromotionCampaign.id}/return?session_id=cs_untrusted_query_value`,
    );

    await expect(page.getByRole('heading', { name: expected.heading })).toBeVisible();
  });
}

test('shows a zero-total campaign as paid and visibly non-refundable', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      status: 'in_review',
      paymentStatus: 'paid',
      discountAmountMinor: fixturePaidPromotionCampaign.amountMinor,
      taxAmountMinor: 0,
      finalTotalMinor: 0,
      amountRefundedMinor: 0,
      refundableRemainderMinor: 0,
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}/return`);

  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
  await expect(page.getByText('This zero-total campaign has no refundable charge.')).toBeVisible();
  await expect(page.getByText('Final total', { exact: true }).locator('..')).toContainText('USD 0.00');
});

test('fails visibly when a paid campaign has unknown checkout totals', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      status: 'in_review',
      paymentStatus: 'paid',
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}/return`);

  await expect(page.getByRole('heading', { name: 'Payment status unavailable' })).toBeVisible();
  await expect(page.getByRole('alert').filter({
    hasText: 'Final checkout totals are unavailable',
  })).toBeVisible();
  await expect(page.getByText('Final total', { exact: true }).locator('..')).toContainText('Unavailable');
});

test('keeps paid-promotion intake within a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/promote/new');
  await expect(page.getByTestId('paid-promotion-track-input')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
});

test('keeps promoter home usable within a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaigns: [fixturePaidPromotionCampaign],
    paidPromotionSubjects: fixturePaidPromotionSubjects,
  });

  await page.goto('/promote');
  await expect(page.getByTestId('paid-promotion-new-campaign')).toBeVisible();
  await expect(page.getByTestId(
    `paid-promotion-campaign-link-${fixturePaidPromotionCampaign.id}`,
  )).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
});
