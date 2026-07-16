import { expect, test } from '@playwright/test';

import { fixturePosts } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

type AnalyticsCapture = {
  event?: string;
  properties?: Record<string, unknown>;
};

const FAN_ACTION_EVENTS = [
  'post_viewed',
  'streaming_link_opened',
  'post_platform_conversion_clicked',
] as const;

function findCapture(
  captures: Array<Record<string, unknown>>,
  event: string,
  postId: string,
): AnalyticsCapture | undefined {
  return captures.find((capture) => {
    const properties = capture.properties;
    return capture.event === event &&
      properties !== null &&
      typeof properties === 'object' &&
      !Array.isArray(properties) &&
      (properties as Record<string, unknown>).post_id === postId;
  });
}

test('attributes only campaign-deliverable fan actions from the server post response', async ({ page }) => {
  const captures: Array<Record<string, unknown>> = [];
  const paidPost = {
    ...fixturePosts.publicTrack,
    postId: 'post-paid-deliverable',
    musicElementId: 'track-paid-deliverable',
    paidPromotionCampaignId: 'pmc_FixtureCampaign01',
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
});
