import * as Sentry from '@sentry/nextjs';
import { normalizePlatform, sanitizeRoute } from '../analytics/sanitize';
import { normalizeCorrelationId } from './correlation';
import { ERROR_CATEGORIES, type ErrorCategory, getDeploymentMetadata } from './fields';
import { appLogger, redactLogContext, type LogContext } from './logger';

type UiObservabilityContext = {
  route?: string;
  userId?: string;
  sessionId?: string;
  environment?: string;
  release?: string;
  sourcePlatform?: string;
  targetPlatforms?: string[];
  correlationId?: string;
  conversionJobId?: string;
  operation?: string;
  errorCategory?: ErrorCategory;
};

const SESSION_ID_KEY = 'cassette_observability_session_id';
let activeContext: UiObservabilityContext = {};

function getOrCreateUiSessionId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) {
      return existing;
    }

    const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `session:${crypto.randomUUID()}`
      : `session:${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.sessionStorage.setItem(SESSION_ID_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

function normalizePlatforms(values: string[] | undefined): string | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const normalized = values
    .map((value) => normalizePlatform(value))
    .filter((value): value is NonNullable<ReturnType<typeof normalizePlatform>> => Boolean(value));

  return normalized.length > 0 ? Array.from(new Set(normalized)).join(',') : undefined;
}

export function buildUiSentryContext(input: UiObservabilityContext = {}): UiObservabilityContext {
  const metadata = getDeploymentMetadata();
  return {
    route: sanitizeRoute(input.route) || activeContext.route,
    userId: input.userId || activeContext.userId,
    sessionId: input.sessionId || activeContext.sessionId || getOrCreateUiSessionId(),
    environment: input.environment || metadata.environment,
    release: input.release || metadata.release,
    sourcePlatform: normalizePlatform(input.sourcePlatform) || activeContext.sourcePlatform,
    targetPlatforms: input.targetPlatforms || activeContext.targetPlatforms,
    correlationId: normalizeCorrelationId(input.correlationId) || activeContext.correlationId,
    conversionJobId: input.conversionJobId || activeContext.conversionJobId,
    operation: input.operation || activeContext.operation,
    errorCategory: input.errorCategory || activeContext.errorCategory,
  };
}

function applySentryContext(context: UiObservabilityContext): void {
  Sentry.setTag('service', 'CassetteUI');
  if (context.environment) Sentry.setTag('environment', context.environment);
  if (context.release) Sentry.setTag('release', context.release);
  if (context.route) Sentry.setTag('route', context.route);
  if (context.sourcePlatform) Sentry.setTag('source_platform', context.sourcePlatform);
  if (context.correlationId) Sentry.setTag('correlation_id', context.correlationId);
  if (context.conversionJobId) Sentry.setTag('conversion_job_id', context.conversionJobId);
  if (context.operation) Sentry.setTag('operation', context.operation);
  if (context.errorCategory) Sentry.setTag('error_category', context.errorCategory);

  const targetPlatforms = normalizePlatforms(context.targetPlatforms);
  if (targetPlatforms) Sentry.setTag('target_platforms', targetPlatforms);

  if (context.userId || context.sessionId) {
    Sentry.setUser({ id: context.userId || context.sessionId });
  }
}

export function setUiObservabilityContext(context: UiObservabilityContext): void {
  activeContext = {
    ...activeContext,
    ...buildUiSentryContext(context),
  };
  applySentryContext(activeContext);
}

export function captureUiException(error: unknown, context: UiObservabilityContext = {}): void {
  const safeContext = {
    ...activeContext,
    ...buildUiSentryContext(context),
  };

  appLogger.error('ui_exception', {
    error,
    ...safeContext,
    error_category: safeContext.errorCategory || ERROR_CATEGORIES.unexpectedException,
  });

  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries({
      route: safeContext.route,
      user_id: safeContext.userId,
      session_id: safeContext.sessionId,
      environment: safeContext.environment,
      release: safeContext.release,
      source_platform: safeContext.sourcePlatform,
      target_platforms: normalizePlatforms(safeContext.targetPlatforms),
      correlation_id: safeContext.correlationId,
      conversion_job_id: safeContext.conversionJobId,
      operation: safeContext.operation,
      error_category: safeContext.errorCategory || ERROR_CATEGORIES.unexpectedException,
    })) {
      if (value) scope.setTag(key, String(value));
    }

    scope.setContext('cassette_ui', redactLogContext(safeContext as LogContext) || {});
    Sentry.captureException(error);
  });
}

type ScrubbableSentryEvent = {
  request?: unknown;
  contexts?: unknown;
  extra?: unknown;
  message?: unknown;
  exception?: unknown;
  breadcrumbs?: unknown;
};

function scrubLogObject(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  return redactLogContext(value as LogContext, { includeDeploymentMetadata: false }) || value;
}

function scrubException(value: unknown): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const original = value as Record<string, unknown>;
  const scrubbed = scrubLogObject(value) as Record<string, unknown>;
  const values = Array.isArray(original.values)
    ? original.values.map((exceptionValue) => scrubLogObject(exceptionValue))
    : scrubbed.values;

  return {
    ...scrubbed,
    values,
  };
}

function scrubBreadcrumbs(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((breadcrumb) => scrubLogObject(breadcrumb));
}

export function scrubSentryEvent<T extends ScrubbableSentryEvent>(event: T): T {
  const message = typeof event.message === 'string'
    ? scrubLogObject({ message: event.message }) as { message?: unknown }
    : undefined;

  return {
    ...event,
    request: redactLogContext(event.request as LogContext | undefined, { includeDeploymentMetadata: false }) || event.request,
    contexts: redactLogContext(event.contexts as LogContext | undefined, { includeDeploymentMetadata: false }) || event.contexts,
    extra: redactLogContext(event.extra as LogContext | undefined, { includeDeploymentMetadata: false }) || event.extra,
    ...(message ? { message: message.message } : {}),
    exception: scrubException(event.exception),
    breadcrumbs: scrubBreadcrumbs(event.breadcrumbs),
  };
}
