"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isInternalOrDemoRoute = isInternalOrDemoRoute;
exports.isCassetteInternalAccount = isCassetteInternalAccount;
exports.isDevSuppressed = isDevSuppressed;
exports.shouldSuppressClientCapture = shouldSuppressClientCapture;
const INTERNAL_ROUTE_PREFIXES = [
    '/debug',
    '/demo',
    '/music-auth-demo',
    '/auth/shadcn-signin',
    '/auth/shadcn-signup',
];
function normalizePath(path) {
    if (!path)
        return '/';
    if (!path.startsWith('/'))
        return `/${path}`;
    return path;
}
function isInternalOrDemoRoute(route) {
    if (!route)
        return false;
    const path = normalizePath(route.split('?')[0].split('#')[0]);
    return INTERNAL_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
function isCassetteInternalAccount(accountType) {
    if (accountType == null)
        return false;
    if (typeof accountType === 'number') {
        return accountType === 2;
    }
    return accountType.toLowerCase() === 'cassetteteam';
}
function isDevSuppressed(explicitDevFlag) {
    if (explicitDevFlag !== undefined) {
        return !explicitDevFlag;
    }
    const isDev = process.env.NODE_ENV !== 'production';
    if (!isDev)
        return false;
    return process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV !== 'true';
}
function shouldSuppressClientCapture(options) {
    if (isInternalOrDemoRoute(options.route)) {
        return true;
    }
    if (isDevSuppressed(options.allowInDev)) {
        return true;
    }
    return false;
}
