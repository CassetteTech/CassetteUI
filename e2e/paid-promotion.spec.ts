import { expect, test } from '@playwright/test';
import {
  fixtureConvertTemplates,
  fixturePaidPromotionAlbumCampaign,
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
    paidPromotionCampaigns: [fixturePaidPromotionCampaign, fixturePaidPromotionAlbumCampaign],
    paidPromotionSubjects: fixturePaidPromotionSubjects,
  });

  await page.goto('/promote');
  const campaignRequest = await campaignRequestPromise;
  const subjectRequest = await subjectRequestPromise;

  await expect(page.getByRole('heading', { name: 'Promotion home' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your campaigns' })).toBeVisible();
  await expect(page.getByText('Signal Fire').first()).toBeVisible();
  await expect(page.getByText('Awaiting payment')).toBeVisible();

  // Campaigns of either type render with a type badge and their own title —
  // no track-shaped fallbacks.
  const albumCampaign = page.getByTestId(
    `paid-promotion-campaign-card-${fixturePaidPromotionAlbumCampaign.id}`,
  );
  await expect(albumCampaign).toContainText('Album');
  await expect(albumCampaign).toContainText('Signal Fire (Deluxe)');
  await expect(albumCampaign).toContainText('Mia Groove');
  await expect(page.getByText('Subject details unavailable')).toHaveCount(0);

  const subjectCatalog = page.locator(
    'section[aria-labelledby="promoted-subjects-heading"]',
  );
  await expect(subjectCatalog.getByText('Signal Fire', { exact: true })).toBeVisible();
  await expect(subjectCatalog.getByText('2 campaigns')).toBeVisible();
  await expect(subjectCatalog.getByText('In review · 1')).toBeVisible();
  await expect(subjectCatalog.getByText('Completed · 1').first()).toBeVisible();
  // The artist subject has no secondary names and must not claim one.
  await expect(subjectCatalog.getByText('Artist', { exact: true })).toBeVisible();
  await expect(subjectCatalog.getByText('Artist unavailable')).toHaveCount(0);
  await expect(page.getByTestId('paid-promotion-new-campaign')).toHaveAttribute(
    'href',
    '/promote/new',
  );
  await expect(page.getByTestId(
    `paid-promotion-subject-repeat-${fixturePaidPromotionSubjects[0].elementId}`,
  )).toHaveAttribute(
    'href',
    `/promote/new?subject=${fixturePaidPromotionSubjects[0].elementId}`,
  );
  await expect(page.getByText("Other owner's campaign")).toHaveCount(0);
  expect(new URL(campaignRequest.url()).search).toBe('');
  expect(new URL(subjectRequest.url()).search).toBe('');
  expect(requestedApiPaths.some((path) => path.includes('/internal/paid-promotions'))).toBe(false);

  await page.getByTestId(`paid-promotion-campaign-link-${fixturePaidPromotionCampaign.id}`).click();
  await expect(page).toHaveURL(`/promote/${fixturePaidPromotionCampaign.id}`);
  await expect(page.getByRole('heading', { name: 'Campaign details' })).toBeVisible();
  await expect(page.getByText(fixturePaidPromotionCampaign.brief)).toBeVisible();
});

test('starts a repeat campaign with the canonical subject already resolved', async ({ page }) => {
  const analyticsCaptures: Array<Record<string, unknown>> = [];
  const deliveredCampaign = {
    ...fixturePaidPromotionCampaign,
    status: 'delivered',
    paymentStatus: 'paid',
    discountAmountMinor: 0,
    taxAmountMinor: 0,
    finalTotalMinor: fixturePaidPromotionCampaign.amountMinor,
    amountRefundedMinor: 0,
    refundableRemainderMinor: fixturePaidPromotionCampaign.amountMinor,
  };
  let conversionRequests = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/api/v1/convert'
    ) {
      conversionRequests += 1;
    }
  });

  await mockCassetteApp(page, {
    analyticsCaptures,
    currentUser: fixtureUsers.member,
    paidPromotionCampaigns: [deliveredCampaign],
    paidPromotionSubjects: [fixturePaidPromotionSubjects[0]],
  });

  await page.goto('/promote');
  const repeatAction = page.getByTestId(
    `paid-promotion-campaign-repeat-${deliveredCampaign.id}`,
  );
  await expect(repeatAction).toHaveAttribute(
    'href',
    `/promote/new?subject=${deliveredCampaign.elementId}`,
  );
  await repeatAction.click();

  await expect(page).toHaveURL(`/promote/new?subject=${deliveredCampaign.elementId}`);
  const resolvedSubject = page.getByTestId('paid-promotion-resolved-subject');
  await expect(resolvedSubject).toContainText(fixtureConvertTemplates.paidPromotionTrack.title);
  await expect(resolvedSubject).toContainText('Canonical track');
  await expect(page.getByTestId('paid-promotion-subject-input')).toHaveValue(
    fixtureConvertTemplates.paidPromotionTrack.originalUrl,
  );
  await expect(page.getByTestId(
    `paid-promotion-rate-card-${fixturePaidPromotionRateCards[0].id}`,
  )).toBeVisible();
  expect(conversionRequests).toBe(0);

  const attestation = page.getByTestId('paid-promotion-attestation');
  await expect(attestation).not.toBeChecked();
  await page.getByTestId(
    `paid-promotion-rate-card-${fixturePaidPromotionRateCards[0].id}`,
  ).click();
  await page.getByTestId('paid-promotion-brief').fill(
    'Bring this track back for a second audience run.',
  );
  await page.getByLabel('Who is promoting this music?').click();
  await page.getByRole('option', { name: 'I am the artist', exact: true }).click();
  await attestation.check();
  await page.getByTestId('paid-promotion-submit').click();

  const campaignRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname === '/api/v1/paid-promotions/campaigns',
  );
  await page.getByTestId('paid-promotion-confirm-checkout').click();
  const campaignPayload = (await campaignRequestPromise).postDataJSON() as Record<string, unknown>;
  expect(campaignPayload.elementId).toBe(deliveredCampaign.elementId);
  expect(campaignPayload.submittedUrl).toBe(
    fixtureConvertTemplates.paidPromotionTrack.originalUrl,
  );
  expect(campaignPayload.attestationAccepted).toBe(true);

  await expect.poll(() => analyticsCaptures.some((capture) => {
    const properties = capture.properties;
    return capture.event === 'paid_promotion_intake_started' &&
      properties !== null &&
      typeof properties === 'object' &&
      !Array.isArray(properties) &&
      (properties as Record<string, unknown>).source_context === 'repeat';
  })).toBe(true);
});

test('shows every published or verified result on a delivered campaign detail', async ({ page }) => {
  const deliveredCampaign = {
    ...fixturePaidPromotionCampaign,
    status: 'delivered',
    paymentStatus: 'paid',
    discountAmountMinor: 0,
    taxAmountMinor: 500,
    finalTotalMinor: 3000,
    amountRefundedMinor: 0,
    refundableRemainderMinor: 3000,
    requestedWindowStart: '2026-07-18',
    requestedWindowEnd: '2026-07-25',
    deliverables: [
      {
        channel: 'instagram',
        publishedAtUtc: '2026-07-18T14:30:00Z',
        evidenceUrl: 'https://social.example/instagram-result',
        status: 'published' as const,
      },
      {
        channel: 'reddit',
        publishedAtUtc: '2026-07-20T09:00:00Z',
        evidenceUrl: 'https://social.example/reddit-result',
        status: 'verified' as const,
      },
    ],
  };
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: deliveredCampaign,
  });

  await page.goto(`/promote/${deliveredCampaign.id}`);

  await expect(page.getByRole('heading', { name: 'Campaign details' })).toBeVisible();
  await expect(page.getByText('Delivered', { exact: true })).toBeVisible();
  const summary = page.getByTestId('paid-promotion-delivery-summary');
  await expect(summary).toContainText('Instagram 1');
  await expect(summary).toContainText('Reddit 1');
  await expect(summary).toContainText('Jul');
  const evidenceLinks = page.getByRole('link', { name: 'View evidence' });
  await expect(evidenceLinks).toHaveCount(2);
  await expect(evidenceLinks.nth(0)).toHaveAttribute(
    'href',
    'https://social.example/instagram-result',
  );
  await expect(evidenceLinks.nth(1)).toHaveAttribute(
    'href',
    'https://social.example/reddit-result',
  );
  await expect(page.getByText(/planned|failed|removed/i)).toHaveCount(0);
});

test('lets the owner cancel an unpaid campaign after confirmation', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: fixturePaidPromotionCampaign,
  });
  const cancelRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname ===
      `/api/v1/paid-promotions/campaigns/${fixturePaidPromotionCampaign.id}/cancel`,
  );

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}`);
  await page.getByRole('button', { name: 'Cancel unpaid campaign' }).click();
  await expect(page.getByRole('alertdialog')).toContainText(
    'Any open checkout session will expire.',
  );
  await page.getByRole('button', { name: 'Cancel campaign', exact: true }).click();

  const cancelRequest = await cancelRequestPromise;
  expect(cancelRequest.postData()).toBeNull();
  await expect(page.getByText('Canceled', { exact: true })).toBeVisible();
  await expect(page.getByText('Checkout expired', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel unpaid campaign' })).toHaveCount(0);
});

test('keeps signed-in users without campaigns on the landing continue state', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaigns: [],
    paidPromotionSubjects: [],
  });

  await page.goto('/promote');
  await expect(page.getByTestId('promote-landing')).toBeVisible();
  await expect(page.getByTestId('promote-landing-cta')).toHaveAttribute('href', '/promote/new');
  await expect(page.getByTestId('promote-landing-cta')).toContainText('Continue');
  await expect(page.getByRole('heading', { name: 'Promotion home' })).toHaveCount(0);
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
  await expect(page.getByText('Promoted music could not be shown.')).toBeVisible();
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

test('renders the full public landing for signed-out visitors with no auth redirect', async ({
  page,
}) => {
  await mockCassetteApp(page);

  await page.goto('/promote');

  await expect(page).toHaveURL('/promote');
  await expect(page).toHaveTitle(/Promote Your Music/);
  await expect(page.getByTestId('promote-landing')).toBeVisible();
  await expect(page.getByText('Cassette itself is the promoter.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Packages' })).toBeVisible();
  // Boost is the only sellable package: weekly price, run-length bounds, and
  // the bulk discount are the offer.
  const boost = page.getByTestId('promote-package-boost');
  await expect(boost).toContainText('/ week');
  await expect(boost).toContainText('1–8 weeks · Tracks and albums');
  await expect(boost).toContainText('10% off when you buy 4 weeks or more');
  // Unsold packages are held back whole — no price, and never a partial claim.
  for (const name of ['spotlight', 'headline']) {
    const unsold = page.getByTestId(`promote-package-${name}`);
    await expect(unsold).toContainText('Not live yet');
    await expect(unsold).toContainText('Not sold yet');
    await expect(unsold).not.toContainText('/ week');
  }
  await expect(page.getByRole('heading', { name: 'No guaranteed outcomes' })).toBeVisible();
  // The week is countable, which is what makes the refund promise falsifiable.
  await expect(page.getByRole('heading', { name: /What a paid week buys/ })).toBeVisible();
  await expect(page.getByText('Each paid week buys at least one story placement')).toBeVisible();
  await expect(page.getByRole('heading', { name: /Refunds/ })).toBeVisible();
  await expect(page.getByText('every week we did not deliver is refunded in full')).toBeVisible();
  await expect(page.getByTestId('promote-landing-cta')).toHaveAttribute('href', '/promote/new');
  await expect(page.getByTestId('paid-promotion-support-contact')).toBeVisible();
});

test('routes the landing CTA through sign-in and back to the campaign intake', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    googleAuthUser: fixtureUsers.member,
  });

  await page.goto('/promote');
  await page.getByTestId('promote-landing-cta').click();

  await expect(page).toHaveURL('/auth/signin?redirect=/promote/new');
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(page).toHaveURL('/promote/new');
  await expect(page.getByTestId('paid-promotion-subject-input')).toBeVisible();
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
  const intakeForm = page.getByRole('form', { name: /Put your music in front/ });
  await expect(intakeForm).toBeVisible();
  const requirements = page.getByTestId('paid-promotion-form-requirements');
  await expect(requirements).toContainText('music selection');
  await expect(requirements).toContainText('campaign brief (20+ characters)');
  const submitButton = page.getByTestId('paid-promotion-submit');
  await expect(submitButton).toHaveAttribute('type', 'submit');
  await expect(submitButton).toHaveAttribute(
    'aria-describedby',
    'paid-promotion-form-requirements',
  );
  const subjectInput = page.getByTestId('paid-promotion-subject-input');
  await expect(subjectInput).toHaveAttribute('required', '');
  await subjectInput.fill(
    fixtureConvertTemplates.paidPromotionTrack.originalUrl,
  );
  await page.getByTestId('paid-promotion-resolve-subject').click();

  const resolvedSubject = page.getByTestId('paid-promotion-resolved-subject');
  await expect(resolvedSubject).toContainText('Signal Fire');
  await expect(resolvedSubject).toContainText('Canonical track');
  await expect(resolvedSubject).toHaveAttribute('role', 'status');
  await expect(resolvedSubject).toBeFocused();
  const packageGroup = page.getByRole('radiogroup', { name: /Choose a package/ });
  await expect(packageGroup).toHaveAttribute('aria-required', 'true');
  const selectedPackage = page.getByTestId(
    `paid-promotion-rate-card-${fixturePaidPromotionRateCards[0].id}`,
  );
  await selectedPackage.click();
  await expect(selectedPackage.getByRole('radio')).toBeChecked();

  // Weeks drive the displayed total: 4 weeks crosses the discount threshold,
  // so $25/week × 4 shows as $90.00 (10% off), not $100.00.
  await expect(page.getByTestId('paid-promotion-weekly-total')).toContainText('$25.00');
  await page.getByTestId('paid-promotion-weeks').click();
  await page.getByRole('option', { name: '4 weeks', exact: true }).click();
  const weeklyTotal = page.getByTestId('paid-promotion-weekly-total');
  await expect(weeklyTotal).toContainText('$100.00');
  await expect(weeklyTotal).toContainText('$10.00');
  await expect(weeklyTotal).toContainText('$90.00');

  const briefInput = page.getByTestId('paid-promotion-brief');
  await expect(briefInput).toHaveAttribute('required', '');
  await briefInput.fill('Too short');
  await expect(requirements).toContainText('campaign brief (20+ characters)');
  await briefInput.fill(
    'Focus on the release story and the live arrangement.',
  );
  await page.getByTestId('paid-promotion-window-start').fill('2026-09-01');
  await page.getByTestId('paid-promotion-window-end').fill('2026-09-14');
  const promoterKind = page.getByLabel('Who is promoting this music?');
  await expect(promoterKind).toHaveAttribute('aria-required', 'true');
  await promoterKind.click();
  await page.getByRole('option', { name: 'I am the artist', exact: true }).click();
  const attestation = page.getByTestId('paid-promotion-attestation');
  await expect(attestation).toHaveAttribute('required', '');
  await attestation.check();
  await expect(requirements).toContainText('All required details are complete.');

  // The review step gates checkout: the amount to be charged and policy
  // links must be shown before any campaign/checkout request fires.
  await page.getByTestId('paid-promotion-submit').click();
  const reviewPanel = page.getByTestId('paid-promotion-review-panel');
  await expect(reviewPanel).toBeVisible();
  await expect(page.getByTestId('paid-promotion-review-total')).toContainText('$90.00');
  await expect(page.getByTestId('paid-promotion-review-weeks')).toContainText('4 weeks');
  await expect(page.getByTestId('paid-promotion-review-window')).toContainText(
    'Sep 1, 2026 – Sep 14, 2026',
  );
  await expect(reviewPanel.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
    'href',
    '/terms',
  );
  await expect(reviewPanel.getByRole('link', { name: 'refund policy' })).toHaveAttribute(
    'href',
    '/promote#refund-policy',
  );

  const campaignRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname === '/api/v1/paid-promotions/campaigns',
  );
  const campaignResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/v1/paid-promotions/campaigns',
  );
  const checkoutRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname.endsWith('/checkout-session'),
  );
  await page.getByTestId('paid-promotion-confirm-checkout').click();
  const campaignRequest = await campaignRequestPromise;
  const campaignResponse = await campaignResponsePromise;
  const checkoutRequest = await checkoutRequestPromise;
  const campaignPayload = campaignRequest.postDataJSON() as Record<string, unknown>;

  expect(campaignPayload.elementId).toBe(fixtureConvertTemplates.paidPromotionTrack.musicElementId);
  expect(campaignPayload.rateCardId).toBe(fixturePaidPromotionRateCards[0].id);
  expect(campaignPayload.weeks).toBe(4);
  expect(campaignPayload.attestationAccepted).toBe(true);
  expect(campaignPayload.promoterKind).toBe('artist');
  expect(campaignPayload.attestedRelationship).toBe('self_artist');
  expect(campaignPayload.requestedWindowStart).toBe('2026-09-01');
  expect(campaignPayload.requestedWindowEnd).toBe('2026-09-14');
  expect(await campaignResponse.json()).toMatchObject({
    requestedWindowStart: '2026-09-01',
    requestedWindowEnd: '2026-09-14',
  });
  expect(campaignPayload).not.toHaveProperty('weeklyAmountMinor');
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Campaign status');
  await expect(page.getByRole('heading', { name: 'Waiting for payment confirmation' }))
    .toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Payment received' })).toBeVisible();
  await expect(page.getByText('Discount', { exact: true }).locator('..'))
    .toContainText('$50.00');
  await expect(page.getByText('Tax', { exact: true }).locator('..'))
    .toContainText('$15.00');
  await expect(page.getByText('Final total', { exact: true }).locator('..'))
    .toContainText('$215.00');
});

test('creates an album campaign from an album link', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/promote/new');
  await page.getByTestId('paid-promotion-subject-input').fill(
    fixtureConvertTemplates.paidPromotionAlbum.originalUrl,
  );
  await page.getByTestId('paid-promotion-resolve-subject').click();

  const resolvedSubject = page.getByTestId('paid-promotion-resolved-subject');
  await expect(resolvedSubject).toContainText('Signal Fire (Deluxe)');
  await expect(resolvedSubject).toContainText('Canonical album');

  // Only the album package is offered for an album subject.
  await expect(page.getByTestId(
    `paid-promotion-rate-card-${fixturePaidPromotionRateCards[1].id}`,
  )).toBeVisible();
  await expect(page.getByTestId(
    `paid-promotion-rate-card-${fixturePaidPromotionRateCards[0].id}`,
  )).toHaveCount(0);

  await page.getByTestId(`paid-promotion-rate-card-${fixturePaidPromotionRateCards[1].id}`).click();
  await page.getByTestId('paid-promotion-brief').fill('Lead with the deluxe edition.');
  await page.getByLabel('Who is promoting this music?').click();
  await page.getByRole('option', { name: 'I am the artist', exact: true }).click();
  await page.getByTestId('paid-promotion-attestation').check();
  await page.getByTestId('paid-promotion-submit').click();

  const campaignRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname === '/api/v1/paid-promotions/campaigns',
  );
  await page.getByTestId('paid-promotion-confirm-checkout').click();
  const campaignPayload = (await campaignRequestPromise).postDataJSON() as Record<string, unknown>;

  expect(campaignPayload.elementId).toBe(
    fixtureConvertTemplates.paidPromotionAlbum.musicElementId,
  );
  expect(campaignPayload.rateCardId).toBe(fixturePaidPromotionRateCards[1].id);
  expect(campaignPayload.weeks).toBe(1);
  await expect(page).toHaveURL(
    new RegExp(`/promote/${fixturePaidPromotionCampaign.id}/return\\?session_id=`),
  );
});

test('says so when a resolved subject type has no packages instead of failing', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/promote/new');
  await page.getByTestId('paid-promotion-subject-input').fill(
    fixtureConvertTemplates.paidPromotionArtist.originalUrl,
  );
  await page.getByTestId('paid-promotion-resolve-subject').click();

  await expect(page.getByTestId('paid-promotion-resolved-subject')).toContainText(
    'Canonical artist',
  );
  await expect(page.getByTestId('paid-promotion-no-packages')).toContainText(
    "doesn't sell paid-promotion packages for artist campaigns yet",
  );
  await expect(page.getByTestId('paid-promotion-weeks')).toHaveCount(0);
  await expect(page.getByTestId('paid-promotion-submit')).toBeDisabled();
});

test('resolves a subject picked from catalog search, not just a pasted link', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/promote/new');
  // A non-link phrase searches the catalog instead of trying to resolve a URL.
  await page.getByTestId('paid-promotion-subject-input').fill('signal fire');
  const result = page.getByText('Signal Fire', { exact: true });
  await result.waitFor();
  await result.click();

  await expect(page.getByTestId('paid-promotion-resolved-subject')).toContainText('Signal Fire');
  // The picked result must reach the package step the same way a pasted link does.
  await expect(
    page.getByTestId(`paid-promotion-rate-card-${fixturePaidPromotionRateCards[0].id}`),
  ).toBeVisible();
});

test('supports native radio keyboard navigation between eligible packages', async ({ page }) => {
  const trackRateCard = fixturePaidPromotionRateCards[0];
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionRateCards: [
      trackRateCard,
      {
        ...trackRateCard,
        id: 'rate-track-featured',
        displayName: 'Featured track package',
      },
    ],
  });

  await page.goto('/promote/new');
  await page.getByTestId('paid-promotion-subject-input').fill(
    fixtureConvertTemplates.paidPromotionTrack.originalUrl,
  );
  await page.getByTestId('paid-promotion-resolve-subject').click();

  const radios = page.getByRole('radiogroup', { name: /Choose a package/ }).getByRole('radio');
  await expect(radios).toHaveCount(2);
  await radios.first().focus();
  await page.keyboard.press('Space');
  await expect(radios.first()).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(radios.nth(1)).toBeChecked();
});

test('announces dependent steps as busy while music is resolving', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionConversionDelayMs: 300,
  });

  await page.goto('/promote/new');
  await page.getByTestId('paid-promotion-subject-input').fill(
    fixtureConvertTemplates.paidPromotionTrack.originalUrl,
  );
  await page.getByTestId('paid-promotion-resolve-subject').click();

  const dependentStatus = page.locator('#paid-promotion-dependent-steps-status');
  await expect(dependentStatus).toContainText('Resolving your music');
  const busySteps = page.locator('section[aria-busy="true"]');
  await expect(busySteps).toHaveCount(3);
  await expect(busySteps.first()).toHaveAttribute(
    'aria-describedby',
    'paid-promotion-dependent-steps-status',
  );

  await expect(page.getByTestId('paid-promotion-resolved-subject')).toBeVisible();
  await expect(busySteps).toHaveCount(0);
});

test('turns resolution failures into customer copy with a recovery action', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/promote/new');
  const input = page.getByTestId('paid-promotion-subject-input');
  await input.fill('https://example.com/internal-record');
  await page.getByTestId('paid-promotion-resolve-subject').click();

  const error = page.getByTestId('paid-promotion-resolution-error');
  await expect(error).toContainText('Use a supported music link');
  await expect(error.getByRole('button', { name: 'Choose another link' })).toBeVisible();

  const missingTemplateUrl = 'https://open.spotify.com/track/noTemplateForThisTrack';
  await input.fill(missingTemplateUrl);
  await page.getByTestId('paid-promotion-resolve-subject').click();

  await expect(error).toContainText('We could not find that music');
  await expect(error.getByRole('button', { name: 'Use a fresh link' })).toBeVisible();
  await expect(error).not.toContainText(`No conversion template for ${missingTemplateUrl}`);
});

test('offers support instead of a dead end when the whole catalog is empty', async ({ page }) => {
  // An environment whose rate-card catalog has not been seeded yet.
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, paidPromotionRateCards: [] });

  await page.goto('/promote/new');

  await expect(page.getByTestId('paid-promotion-empty-catalog')).toContainText(
    'still being finalized',
  );
  await expect(page.getByTestId('paid-promotion-support-contact').first()).toBeVisible();
  await expect(page.getByTestId('paid-promotion-submit')).toBeDisabled();
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
    // Every return state keeps an escape hatch and a support contact.
    await expect(page.getByRole('button', { name: 'Promotion home', exact: true })).toBeVisible();
    await expect(page.getByTestId('paid-promotion-support-contact')).toBeVisible();
  });
}

test('shows the abandoned-checkout panel on the cancel URL, never pending payment', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      paymentStatus: 'pending',
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}/return?checkout=canceled`);

  // The run length the buyer picked is part of what they are confirming.
  await expect(page.getByTestId('paid-promotion-campaign-weeks')).toContainText('1 week');
  await expect(page.getByRole('heading', { name: 'Checkout not completed' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Waiting for payment confirmation' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Return to secure checkout' })).toBeVisible();
});

test('shows the rejection reason and refund expectation for a rejected campaign', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      status: 'rejected',
      rejectionReason: 'Track rights could not be verified.',
      paymentStatus: 'refund_pending',
      discountAmountMinor: 0,
      taxAmountMinor: 0,
      finalTotalMinor: fixturePaidPromotionCampaign.amountMinor,
      amountRefundedMinor: 0,
      refundableRemainderMinor: fixturePaidPromotionCampaign.amountMinor,
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}/return`);

  const campaignStatus = page.getByTestId('paid-promotion-campaign-status');
  await expect(campaignStatus).toContainText('Not approved');
  await expect(campaignStatus).toContainText('Reviewer note: Track rights could not be verified.');
  await expect(campaignStatus).toContainText('refunded in full');
});

test('explains a dispute hold distinctly from a clean refund', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      status: 'on_hold',
      holdKind: 'payment_dispute',
      paymentStatus: 'disputed',
      discountAmountMinor: 0,
      taxAmountMinor: 0,
      finalTotalMinor: fixturePaidPromotionCampaign.amountMinor,
      amountRefundedMinor: 0,
      refundableRemainderMinor: fixturePaidPromotionCampaign.amountMinor,
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}/return`);

  await expect(page.getByRole('heading', { name: 'Payment disputed' })).toBeVisible();
  const campaignStatus = page.getByTestId('paid-promotion-campaign-status');
  await expect(campaignStatus).toContainText('On hold — payment dispute');
  await expect(campaignStatus).toContainText('card issuer');
});

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
  await expect(page.getByText('Final total', { exact: true }).locator('..')).toContainText('$0.00');
  await expect(page.getByRole('link', { name: 'View campaign details' })).toHaveAttribute(
    'href',
    `/promote/${fixturePaidPromotionCampaign.id}`,
  );
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
  await expect(page.getByTestId('paid-promotion-subject-input')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
});

test('keeps the public landing within a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page);

  await page.goto('/promote');
  await expect(page.getByTestId('promote-landing')).toBeVisible();
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

test('keeps campaign detail and evidence links usable within a narrow mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      status: 'delivered',
      paymentStatus: 'paid',
      discountAmountMinor: 0,
      taxAmountMinor: 0,
      finalTotalMinor: fixturePaidPromotionCampaign.amountMinor,
      refundableRemainderMinor: fixturePaidPromotionCampaign.amountMinor,
      deliverables: [{
        channel: 'instagram',
        publishedAtUtc: '2026-07-18T14:30:00Z',
        evidenceUrl: 'https://social.example/mobile-result',
        status: 'verified',
      }],
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}`);
  await expect(page.getByRole('link', { name: 'View evidence' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
});
