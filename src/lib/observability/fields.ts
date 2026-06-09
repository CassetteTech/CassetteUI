export const OBSERVABILITY_FIELDS = {
  service: 'service',
  environment: 'environment',
  release: 'release',
  gitSha: 'git_sha',
  buildId: 'build_id',
  releaseChannel: 'release_channel',
  correlationId: 'correlation_id',
  conversionJobId: 'conversion_job_id',
  platform: 'platform',
  sourcePlatform: 'source_platform',
  targetPlatform: 'target_platform',
  operation: 'operation',
  elementType: 'element_type',
  status: 'status',
  durationMs: 'duration_ms',
  httpStatus: 'http_status',
  retryCount: 'retry_count',
  lambdaRequestId: 'lambda_request_id',
  errorCategory: 'error_category',
} as const;

export const ERROR_CATEGORIES = {
  validation: 'validation',
  auth: 'auth',
  rateLimit: 'rate_limit',
  upstreamUnavailable: 'upstream_unavailable',
  timeout: 'timeout',
  lambdaError: 'lambda_error',
  databaseError: 'database_error',
  unexpectedException: 'unexpected_exception',
} as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[keyof typeof ERROR_CATEGORIES];

export type DeploymentMetadata = {
  service: string;
  environment: string;
  release: string;
  git_sha?: string;
  build_id?: string;
  release_channel?: string;
};

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value != null && value.trim().length > 0)?.trim();
}

export function getDeploymentMetadata(): DeploymentMetadata {
  const environment = firstNonEmpty(
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    process.env.SENTRY_ENVIRONMENT,
    process.env.NEXT_PUBLIC_APP_ENV,
    process.env.NODE_ENV,
  ) || 'unknown';

  const release = firstNonEmpty(
    process.env.NEXT_PUBLIC_SENTRY_RELEASE,
    process.env.SENTRY_RELEASE,
    process.env.NEXT_PUBLIC_RELEASE,
    process.env.RELEASE,
    process.env.NEXT_PUBLIC_GIT_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
  ) || 'unknown';

  return {
    service: 'CassetteUI',
    environment,
    release,
    git_sha: firstNonEmpty(
      process.env.NEXT_PUBLIC_GIT_SHA,
      process.env.GIT_SHA,
      process.env.VERCEL_GIT_COMMIT_SHA,
    ),
    build_id: firstNonEmpty(
      process.env.NEXT_PUBLIC_BUILD_ID,
      process.env.BUILD_ID,
      process.env.VERCEL_DEPLOYMENT_ID,
    ),
    release_channel: firstNonEmpty(
      process.env.NEXT_PUBLIC_RELEASE_CHANNEL,
      process.env.RELEASE_CHANNEL,
      process.env.VERCEL_GIT_COMMIT_REF,
    ),
  };
}
