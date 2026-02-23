"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureServerEvent = captureServerEvent;
const sanitize_1 = require("./sanitize");
const events_1 = require("./events");
const internal_suppression_1 = require("./internal-suppression");
const DEFAULT_POSTHOG_HOST = 'https://app.posthog.com';
function getServerConfig() {
    const apiKey = process.env.POSTHOG_API_KEY;
    const host = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
    return { apiKey, host };
}
async function captureServerEvent(event, distinctId, props = {}) {
    const { apiKey, host } = getServerConfig();
    if (!apiKey || !distinctId) {
        return false;
    }
    if ((0, internal_suppression_1.isInternalOrDemoRoute)(props.route)) {
        return false;
    }
    const withActor = {
        ...props,
        internal_actor: props.internal_actor ?? (0, internal_suppression_1.isCassetteInternalAccount)(props.account_type),
    };
    const sanitized = (0, sanitize_1.sanitizeAnalyticsProps)((0, events_1.withCoreAction)(event, withActor));
    try {
        const response = await fetch(`${host.replace(/\/$/, '')}/capture/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_key: apiKey,
                event,
                distinct_id: distinctId,
                properties: {
                    ...sanitized,
                    $lib: 'cassette-ui-server',
                },
            }),
            cache: 'no-store',
        });
        return response.ok;
    }
    catch {
        return false;
    }
}
