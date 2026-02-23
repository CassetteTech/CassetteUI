"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORE_ACTION_EVENTS = exports.CANONICAL_SUCCESS_EVENTS = void 0;
exports.isCanonicalSuccessEvent = isCanonicalSuccessEvent;
exports.normalizeStatus = normalizeStatus;
exports.withCoreAction = withCoreAction;
exports.CANONICAL_SUCCESS_EVENTS = new Set([
    'auth_signed_up',
    'auth_signed_in',
    'auth_google_oauth_completed',
    'account_deleted',
    'onboarding_completed',
    'profile_updated',
    'profile_music_preferences_updated',
    'music_service_connected',
    'music_service_disconnected',
    'link_converted',
    'post_created',
    'post_updated',
    'post_deleted',
    'playlist_created_on_platform',
    'issue_reported',
]);
exports.CORE_ACTION_EVENTS = new Set([
    'link_converted',
    'post_created',
    'profile_updated',
    'playlist_created_on_platform',
    'music_service_connected',
    'onboarding_completed',
]);
function isCanonicalSuccessEvent(event) {
    return exports.CANONICAL_SUCCESS_EVENTS.has(event);
}
function normalizeStatus(event, props) {
    const next = { ...props };
    if (event.endsWith('_submitted')) {
        next.status = 'submitted';
        next.success = false;
    }
    else if (event.endsWith('_failed')) {
        next.status = 'failed';
        next.success = false;
    }
    else if (isCanonicalSuccessEvent(event)) {
        next.status = 'succeeded';
        next.success = true;
    }
    if (isCanonicalSuccessEvent(event) && (next.status === 'failed' || next.status === 'submitted')) {
        next.status = 'succeeded';
        next.success = true;
    }
    return next;
}
function withCoreAction(event, props) {
    const normalized = normalizeStatus(event, props);
    if (exports.CORE_ACTION_EVENTS.has(event) && (normalized.success === true || normalized.status === 'succeeded')) {
        return {
            ...normalized,
            core_action: true,
        };
    }
    if (normalized.core_action) {
        return {
            ...normalized,
            core_action: false,
        };
    }
    return normalized;
}
