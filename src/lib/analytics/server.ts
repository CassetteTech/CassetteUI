import type { AnalyticsBaseProps, AnalyticsEventName } from './events';
import { sanitizeAnalyticsProps } from './sanitize';
import { withCoreAction } from './events';
import { isInternalOrDemoRoute, isCassetteInternalAccount } from './internal-suppression';

const DEFAULT_POSTHOG_HOST = 'https://app.posthog.com';

function getServerConfig(): { apiKey?: string; host: string } {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
  return { apiKey, host };
}

export async function captureServerEvent<E extends AnalyticsEventName>(
  event: E,
  distinctId: string,
  props: AnalyticsBaseProps = {},
): Promise<boolean> {
  const { apiKey, host } = getServerConfig();
  if (!apiKey || !distinctId) {
    return false;
  }

  if (isInternalOrDemoRoute(props.route)) {
    return false;
  }

  const withActor: AnalyticsBaseProps = {
    ...props,
    internal_actor: props.internal_actor ?? isCassetteInternalAccount(props.account_type),
  };
  const sanitized = sanitizeAnalyticsProps(withCoreAction(event, withActor));

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
  } catch {
    return false;
  }
}
