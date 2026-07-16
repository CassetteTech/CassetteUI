"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const post_platform_conversion_1 = require("../post-platform-conversion");
const sanitize_1 = require("../sanitize");
(0, node_test_1.default)('buildPostPlatformConversionClickedProps builds non-playlist destination open payload', () => {
    const payload = (0, post_platform_conversion_1.buildPostPlatformConversionClickedProps)({
        sourceContext: 'destination_open_button',
        route: '/post/abc',
        postId: 'post-abc',
        elementType: 'track',
        targetPlatform: 'appleMusic',
        sourcePlatform: 'spotify',
        sourceDomain: 'https://music.apple.com/us/album/example',
        isAuthenticated: true,
    });
    strict_1.default.ok(payload);
    strict_1.default.equal(payload?.source_context, 'destination_open_button');
    strict_1.default.equal(payload?.target_platform, 'apple');
    strict_1.default.equal(payload?.source_platform, 'spotify');
    strict_1.default.equal(payload?.element_type, 'track');
    strict_1.default.equal(payload?.post_id, 'post-abc');
    strict_1.default.equal(payload?.source_domain, 'music.apple.com');
});
(0, node_test_1.default)('buildPostPlatformConversionClickedProps builds playlist convert payload', () => {
    const payload = (0, post_platform_conversion_1.buildPostPlatformConversionClickedProps)({
        sourceContext: 'playlist_convert_button',
        route: '/post/playlist-1',
        postId: 'playlist-1',
        elementType: 'playlist',
        targetPlatform: 'spotify',
        sourcePlatform: 'appleMusic',
        sourceDomain: 'https://open.spotify.com/playlist/123',
        isAuthenticated: false,
    });
    strict_1.default.ok(payload);
    strict_1.default.equal(payload?.source_context, 'playlist_convert_button');
    strict_1.default.equal(payload?.target_platform, 'spotify');
    strict_1.default.equal(payload?.source_platform, 'apple');
    strict_1.default.equal(payload?.element_type, 'playlist');
    strict_1.default.equal(payload?.is_authenticated, false);
});
(0, node_test_1.default)('buildPostPlatformConversionClickedProps builds playlist open payload', () => {
    const payload = (0, post_platform_conversion_1.buildPostPlatformConversionClickedProps)({
        sourceContext: 'playlist_open_button',
        route: '/post/playlist-2',
        postId: 'playlist-2',
        elementType: 'playlist',
        targetPlatform: 'deezer',
        sourcePlatform: 'spotify',
        sourceDomain: 'https://www.deezer.com/playlist/456',
    });
    strict_1.default.ok(payload);
    strict_1.default.equal(payload?.source_context, 'playlist_open_button');
    strict_1.default.equal(payload?.target_platform, 'deezer');
    strict_1.default.equal(payload?.element_type, 'playlist');
    strict_1.default.equal(payload?.source_domain, 'www.deezer.com');
});
(0, node_test_1.default)('source attribution context is excluded from post platform conversion event', () => {
    strict_1.default.equal((0, post_platform_conversion_1.isPostPlatformConversionContext)('source_attribution_badge'), false);
    const payload = (0, post_platform_conversion_1.buildPostPlatformConversionClickedProps)({
        sourceContext: 'source_attribution_badge',
        route: '/post/test',
        targetPlatform: 'spotify',
    });
    strict_1.default.equal(payload, null);
});
(0, node_test_1.default)('paid-promotion attribution stays optional and is validated by the analytics sanitizer', () => {
    const paidPayload = (0, post_platform_conversion_1.buildPostPlatformConversionClickedProps)({
        sourceContext: 'destination_open_button',
        route: '/post/paid',
        postId: 'p_PaidDeliverable01',
        paidPromotionCampaignId: 'pmc_0123AbCd',
    });
    const ordinaryPayload = (0, post_platform_conversion_1.buildPostPlatformConversionClickedProps)({
        sourceContext: 'destination_open_button',
        route: '/post/ordinary',
        postId: 'p_OrdinaryPost01',
    });
    const invalidPayload = (0, post_platform_conversion_1.buildPostPlatformConversionClickedProps)({
        sourceContext: 'destination_open_button',
        route: '/post/invalid',
        postId: 'p_InvalidAttribution01',
        paidPromotionCampaignId: 'campaign-from-route',
    });
    strict_1.default.equal(paidPayload?.paid_promotion_campaign_id, 'pmc_0123AbCd');
    strict_1.default.equal(ordinaryPayload?.paid_promotion_campaign_id, undefined);
    strict_1.default.equal((0, sanitize_1.sanitizeAnalyticsProps)(invalidPayload ?? {}).paid_promotion_campaign_id, undefined);
});
