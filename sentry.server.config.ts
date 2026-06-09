import * as Sentry from '@sentry/nextjs';
import { getDeploymentMetadata } from './src/lib/observability/fields';
import { scrubSentryEvent } from './src/lib/observability/error-reporting';

const metadata = getDeploymentMetadata();
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: metadata.environment,
    release: metadata.release,
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
    initialScope: {
      tags: {
        service: metadata.service,
        environment: metadata.environment,
        release: metadata.release,
        git_sha: metadata.git_sha,
        build_id: metadata.build_id,
        release_channel: metadata.release_channel,
      },
    },
  });
}
