// Verifies paid-promotion and curator attribution emitted from public post interactions.

import { expect, test } from '@playwright/test';

import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

type AnalyticsProperties = {
  post_id?: string;
  paid_promotion_campaign_id?: string;
  curator_id?: string;
  is_member_view?: boolean;
};

type AnalyticsCapture = {
  [key: string]: string | AnalyticsProperties | undefined;
  event?: string;
  properties?: AnalyticsProperties;
};

const FAN_ACTION_EVENTS = [
  'post_viewed',
  'streaming_link_opened',
  'post_platform_conversion_clicked',
] as const;

const CURATOR_ATTRIBUTED_EVENTS = [
  'post_viewed',
  'post_shared',
  'streaming_link_opened',
] as const;

function findCapture(
  captures: AnalyticsCapture[],
  event: string,
  postId: string,
): AnalyticsCapture | undefined {
  return captures.find((capture) =>
    capture.event === event && capture.properties?.post_id === postId
  );
}

test('attributes only campaign-deliverable fan actions from the server post response', async ({ page }) => {
  const captures: AnalyticsCapture[] = [];
  const paidPost = {
    ...fixturePosts.publicTrack,
    postId: 'post-paid-deliverable',
    musicElementId: 'track-paid-deliverable',
    paidPromotionCampaignId: 'pmc_FixtureCampaign01',
    curatorId: 'cpr_FixtureCurator01',
    isMemberView: false,
  };

  await mockCassetteApp(page, {
    analyticsCaptures: captures,
    posts: [paidPost, fixturePosts.publicTrack],
  });

  for (const post of [paidPost, fixturePosts.publicTrack]) {
    if (post.postId === fixturePosts.publicTrack.postId) {
      await page.evaluate(({ postId, cachedPost }) => {
        sessionStorage.setItem(
          `cassette:prefetched-post:${postId}`,
          JSON.stringify({
            ...cachedPost,
            paidPromotionCampaignId: 'pmc_ForgedFromSessionStorage',
            curatorId: 'cpr_ForgedFromSessionStorage',
            isMemberView: true,
          }),
        );
      }, {
        postId: post.postId,
        cachedPost: {
          success: true,
          postId: post.postId,
          elementType: post.elementType,
          musicElementId: post.musicElementId,
          originalLink: post.originalUrl,
          details: {
            title: post.title,
            artist: post.artist,
          },
          platforms: {
            applemusic: { url: post.convertedUrls.appleMusic },
          },
        },
      });
    }

    await page.goto(`/post/${post.postId}`);
    await expect(page.getByText(post.title, { exact: true }).first()).toBeVisible();
    await expect.poll(() => Boolean(findCapture(captures, 'post_viewed', post.postId))).toBe(true);
    await page.locator('button[aria-label="Share"]:visible').first().click();
    await expect.poll(() => Boolean(findCapture(captures, 'post_shared', post.postId))).toBe(true);

    const destinationLink = page.locator(
      `a[href="${post.convertedUrls.appleMusic}"]:visible`,
    ).first();
    await destinationLink.evaluate((link) => {
      link.addEventListener('click', (event) => event.preventDefault(), {
        capture: true,
        once: true,
      });
    });
    await destinationLink.dispatchEvent('click', {
      button: 0,
    });
    await expect.poll(() => FAN_ACTION_EVENTS.every((event) =>
      Boolean(findCapture(captures, event, post.postId)),
    )).toBe(true);
  }

  for (const event of FAN_ACTION_EVENTS) {
    const paidCapture = findCapture(captures, event, paidPost.postId);
    const ordinaryCapture = findCapture(captures, event, fixturePosts.publicTrack.postId);

    expect(paidCapture?.properties?.paid_promotion_campaign_id).toBe(
      paidPost.paidPromotionCampaignId,
    );
    expect(ordinaryCapture?.properties).not.toHaveProperty('paid_promotion_campaign_id');
  }

  for (const event of CURATOR_ATTRIBUTED_EVENTS) {
    const paidCapture = findCapture(captures, event, paidPost.postId);
    const ordinaryCapture = findCapture(captures, event, fixturePosts.publicTrack.postId);

    expect(paidCapture?.properties?.curator_id).toBe(paidPost.curatorId);
    expect(paidCapture?.properties?.is_member_view).toBe(false);
    expect(ordinaryCapture?.properties).not.toHaveProperty('curator_id');
    expect(ordinaryCapture?.properties?.is_member_view).toBe(false);
  }
});

test('records a member post view only from server-provided entitlement state', async ({ page }) => {
  const captures: AnalyticsCapture[] = [];
  const subscriberPost = {
    ...fixturePosts.publicTrack,
    postId: 'post-subscriber-only',
    musicElementId: 'track-subscriber-only',
    curatorId: 'cpr_FixtureCurator01',
    isMemberView: true,
  };

  await mockCassetteApp(page, {
    analyticsCaptures: captures,
    currentUser: fixtureUsers.member,
    posts: [subscriberPost],
  });

  await page.goto(`/post/${subscriberPost.postId}`);
  await expect(page.getByText(subscriberPost.title, { exact: true }).first()).toBeVisible();
  await expect.poll(() => Boolean(
    findCapture(captures, 'member_post_viewed', subscriberPost.postId),
  )).toBe(true);

  for (const event of ['post_viewed', 'member_post_viewed']) {
    const capture = findCapture(captures, event, subscriberPost.postId);

    expect(capture?.properties?.curator_id).toBe(subscriberPost.curatorId);
    expect(capture?.properties?.is_member_view).toBe(true);
  }
});
