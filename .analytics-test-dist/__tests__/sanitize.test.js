"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const sanitize_1 = require("../sanitize");
(0, node_test_1.default)('sanitizeAnalyticsProps strips forbidden and unknown fields', () => {
    const result = (0, sanitize_1.sanitizeAnalyticsProps)({
        route: '/post/123?token=abc',
        source_platform: 'appleMusic',
        target_platform: 'spotify',
        source_context: 'playlist_convert_button',
        is_creator_view: false,
        is_repost: false,
        element_type: 'track',
        post_id: 'post-123',
        source_domain: 'https://open.spotify.com/track/abc?si=secret',
        signup_source: 'friend',
        signup_medium: 'dm',
        signup_campaign: 'beta_batch',
        first_referrer_domain: 'https://www.instagram.com/cassette',
        first_touch_source: 'friend',
        user_id: 'user-1',
        internal_actor: true,
        playlist_track_count: 212,
        tracks_added: 180,
        tracks_failed: 20,
        total_tracks: 200,
        connection_state: 'connection_required',
        description: 'should-not-pass',
        query_text: 'secret search',
        made_up: 'nope',
    });
    strict_1.default.equal(result.route, '/post/123');
    strict_1.default.equal(result.source_platform, 'apple');
    strict_1.default.equal(result.target_platform, 'spotify');
    strict_1.default.equal(result.source_context, 'playlist_convert_button');
    strict_1.default.equal(result.is_creator_view, false);
    strict_1.default.equal(result.is_repost, false);
    strict_1.default.equal(result.element_type, 'track');
    strict_1.default.equal(result.post_id, 'post-123');
    strict_1.default.equal(result.source_domain, 'open.spotify.com');
    strict_1.default.equal(result.signup_source, 'friend');
    strict_1.default.equal(result.signup_medium, 'dm');
    strict_1.default.equal(result.signup_campaign, 'beta_batch');
    strict_1.default.equal(result.first_referrer_domain, 'www.instagram.com');
    strict_1.default.equal(result.first_touch_source, 'friend');
    strict_1.default.equal(result.user_id, 'user-1');
    strict_1.default.equal(result.internal_actor, true);
    strict_1.default.equal(result.playlist_track_count, 212);
    strict_1.default.equal(result.tracks_added, 180);
    strict_1.default.equal(result.tracks_failed, 20);
    strict_1.default.equal(result.total_tracks, 200);
    strict_1.default.equal(result.connection_state, 'connection_required');
    strict_1.default.equal(result.description, undefined);
    strict_1.default.equal(result.query_text, undefined);
    strict_1.default.equal(result.made_up, undefined);
});
