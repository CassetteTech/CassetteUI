const INTERNAL_ROUTE_PREFIXES = [
  '/debug',
  '/demo',
  '/music-auth-demo',
  '/auth/shadcn-signin',
  '/auth/shadcn-signup',
];

function normalizePath(path: string): string {
  if (!path) return '/';
  if (!path.startsWith('/')) return `/${path}`;
  return path;
}

export function isInternalOrDemoRoute(route?: string | null): boolean {
  if (!route) return false;

  const path = normalizePath(route.split('?')[0].split('#')[0]);
  return INTERNAL_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function isCassetteInternalAccount(accountType?: string | number | null): boolean {
  if (accountType == null) return false;
  if (typeof accountType === 'number') {
    return accountType === 2;
  }

  return accountType.toLowerCase() === 'cassetteteam';
}

export function isDevSuppressed(explicitDevFlag?: boolean): boolean {
  if (explicitDevFlag !== undefined) {
    return !explicitDevFlag;
  }

  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) return false;

  return process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV !== 'true';
}

export function shouldSuppressClientCapture(options: {
  route?: string | null;
  accountType?: string | number | null;
  allowInDev?: boolean;
}): boolean {
  if (isInternalOrDemoRoute(options.route)) {
    return true;
  }

  if (isDevSuppressed(options.allowInDev)) {
    return true;
  }

  return false;
}
