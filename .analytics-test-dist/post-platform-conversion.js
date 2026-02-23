"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST_PLATFORM_CONVERSION_CONTEXTS = void 0;
exports.isPostPlatformConversionContext = isPostPlatformConversionContext;
exports.buildPostPlatformConversionClickedProps = buildPostPlatformConversionClickedProps;
const sanitize_1 = require("./sanitize");
exports.POST_PLATFORM_CONVERSION_CONTEXTS = [
    'destination_open_button',
    'playlist_convert_button',
    'playlist_open_button',
];
function isPostPlatformConversionContext(value) {
    return exports.POST_PLATFORM_CONVERSION_CONTEXTS.includes(value);
}
function normalizePlatformDimension(value) {
    return (0, sanitize_1.normalizePlatform)(value) ?? 'unknown';
}
function buildPostPlatformConversionClickedProps(input) {
    if (!isPostPlatformConversionContext(input.sourceContext)) {
        return null;
    }
    return {
        route: input.route,
        source_surface: 'post',
        post_id: input.postId,
        element_type: input.elementType,
        target_platform: normalizePlatformDimension(input.targetPlatform),
        source_platform: normalizePlatformDimension(input.sourcePlatform),
        source_domain: (0, sanitize_1.sanitizeDomain)(input.sourceDomain),
        is_authenticated: input.isAuthenticated,
        source_context: input.sourceContext,
    };
}
