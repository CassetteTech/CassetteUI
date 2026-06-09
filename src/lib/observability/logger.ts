import { getDeploymentMetadata } from './fields';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

const REDACTED = '[REDACTED]';
const REDACTED_URL = '[REDACTED_URL]';
const MAX_DEPTH = 4;

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|credential|authorization|auth_header|private.?key|client.?secret|refresh.?token|access.?token|id.?token|cookie|set.?cookie|query.?string|oauth.?code|(^|[_-])code$|(^|[_-])state$|(^|[_-])body$|(^|[_-])payload$|(^|[_-])data$|description|raw.?response|response.?body/i;
const URL_KEY_PATTERN = /(^|_)(url|uri|href|link)$|source.?link|source.?url|callback.?url|redirect.?url/i;
const SAFE_URL_KEYS = new Set(['route', 'route_context', 'source_domain', 'first_referrer_domain']);
const AUTH_VALUE_PATTERN = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
const SECRET_ASSIGNMENT_PATTERN = /\b(code|state|access_token|refresh_token|id_token|token|client_secret)=([^&\s"'<>]+)/gi;
const URL_IN_TEXT_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

function shouldEmit(level: LogLevel): boolean {
  if (level === 'warn' || level === 'error') {
    return true;
  }

  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS === 'true';
}

function redactFreeformText(value: string, options: { redactUrls?: boolean } = {}): string {
  const shouldRedactUrls = options.redactUrls !== false;
  let redacted = shouldRedactUrls ? value.replace(URL_IN_TEXT_PATTERN, REDACTED_URL) : value;
  redacted = redacted.replace(AUTH_VALUE_PATTERN, (_match, scheme: string) => `${scheme} ${REDACTED}`);
  redacted = redacted.replace(SECRET_ASSIGNMENT_PATTERN, (_match, key: string) => `${key}=${REDACTED}`);
  return redacted.length > 240 ? `${redacted.slice(0, 240)}...` : redacted;
}

function normalizeError(error: Error): LogContext {
  const normalized: LogContext = {
    name: error.name,
    message: redactFreeformText(error.message),
  };

  if (process.env.NODE_ENV === 'development' && error.stack) {
    normalized.stack = redactFreeformText(error.stack);
  }

  return normalized;
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (value == null) {
    return value;
  }

  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED;
  }

  if (!SAFE_URL_KEYS.has(key) && URL_KEY_PATTERN.test(key)) {
    return REDACTED_URL;
  }

  if (value instanceof Error) {
    return normalizeError(value);
  }

  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value) && !SAFE_URL_KEYS.has(key)) {
      return REDACTED_URL;
    }

    return redactFreeformText(value, { redactUrls: !SAFE_URL_KEYS.has(key) });
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '[Object]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactValue(key, item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
      childKey,
      redactValue(childKey, childValue, depth + 1),
    ]),
  );
}

export function redactLogContext(
  context?: LogContext,
  options: { includeDeploymentMetadata?: boolean } = {},
): LogContext | undefined {
  if (!context) {
    return undefined;
  }

  const metadata = getDeploymentMetadata();
  const deploymentContext = options.includeDeploymentMetadata === false
    ? {}
    : {
        service: metadata.service,
        environment: metadata.environment,
        release: metadata.release,
        git_sha: metadata.git_sha,
        build_id: metadata.build_id,
        release_channel: metadata.release_channel,
      };

  return Object.fromEntries(
    Object.entries({
      ...deploymentContext,
      ...context,
    }).flatMap(([key, value]) => {
      const redacted = redactValue(key, value, 0);
      return redacted === undefined ? [] : [[key, redacted]];
    }),
  );
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldEmit(level)) {
    return;
  }

  const redactedContext = redactLogContext(context);
  const args = redactedContext ? [message, redactedContext] : [message];

  if (level === 'debug') {
    console.debug(...args);
    return;
  }

  if (level === 'info') {
    console.info(...args);
    return;
  }

  if (level === 'warn') {
    console.warn(...args);
    return;
  }

  console.error(...args);
}

export const appLogger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
