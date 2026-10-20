import { isIP } from 'node:net';
import { z } from 'zod';

const MAX_USER_AGENT_LENGTH = 1000;
const PORT_PATTERN = /^\d{1,5}$/;
const IPV4_MAPPED_PATTERN = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

type HeaderReader = Pick<Headers, 'get'>;

export type IngestClientContext = {
  ip?: string;
  userAgent?: string;
};

export type ParsedUserAgent = {
  browser?: string;
  os?: string;
  deviceType?: 'Mobile' | 'Tablet' | 'Desktop';
};

const captureEventSchema = z
  .object({ properties: z.record(z.string(), z.unknown()).optional() })
  .passthrough();
const captureBatchSchema = z.object({ batch: z.array(captureEventSchema) }).passthrough();

type CaptureEvent = z.infer<typeof captureEventSchema>;

function normalizeIp(candidate: string): string | undefined {
  const mapped = IPV4_MAPPED_PATTERN.exec(candidate);
  const ip = mapped ? mapped[1] : candidate;
  return isIP(ip) ? ip : undefined;
}

function stripPort(value: string): string | undefined {
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    return end > 1 ? value.slice(1, end) : undefined;
  }

  const lastColon = value.lastIndexOf(':');
  if (lastColon <= 0 || !PORT_PATTERN.test(value.slice(lastColon + 1))) {
    return undefined;
  }
  return value.slice(0, lastColon);
}

/**
 * CloudFront formats `cloudfront-viewer-address` as `ip:port` without brackets,
 * even for IPv6 (`2001:db8::1:443`), so the port is always the last segment.
 */
export function parseCloudFrontViewerAddress(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const host = stripPort(trimmed);
  return host ? normalizeIp(host) : undefined;
}

/**
 * `x-forwarded-for` entries are normally bare IPs, but some proxies append a port.
 * A bare IPv6 address is tried first so its final group is not mistaken for a port.
 */
export function parseForwardedForEntry(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const bare = trimmed.startsWith('[') ? undefined : normalizeIp(trimmed);
  if (bare) return bare;

  const host = stripPort(trimmed);
  return host ? normalizeIp(host) : undefined;
}

export function resolveClientIp(headers: HeaderReader): string | undefined {
  try {
    const fromCloudFront = parseCloudFrontViewerAddress(headers.get('cloudfront-viewer-address'));
    if (fromCloudFront) return fromCloudFront;

    const firstForwarded = headers.get('x-forwarded-for')?.split(',')[0];
    return parseForwardedForEntry(firstForwarded);
  } catch {
    return undefined;
  }
}

export function resolveUserAgent(headers: HeaderReader): string | undefined {
  try {
    const value = headers.get('user-agent')?.trim();
    return value ? value.slice(0, MAX_USER_AGENT_LENGTH) : undefined;
  } catch {
    return undefined;
  }
}

export function resolveIngestClientContext(headers: HeaderReader): IngestClientContext {
  return {
    ip: resolveClientIp(headers),
    userAgent: resolveUserAgent(headers),
  };
}

function detectBrowser(ua: string): string | undefined {
  if (/\bEdg(?:e|A|iOS)?\//.test(ua)) return 'Microsoft Edge';
  if (/\bSamsungBrowser\//.test(ua)) return 'Samsung Internet';
  if (/\bOPR\/|\bOpera\b/.test(ua)) return 'Opera';
  if (/\bFB(?:AN|AV|IOS)\b/.test(ua)) return 'Facebook Mobile';
  if (/\bInstagram\b/.test(ua)) return 'Instagram';
  if (/\bCriOS\//.test(ua)) return 'Chrome iOS';
  if (/\bFxiOS\//.test(ua)) return 'Firefox iOS';
  if (/\bFirefox\//.test(ua)) return 'Firefox';
  if (/\b(?:Chrome|Chromium)\//.test(ua)) return 'Chrome';
  if (/\bAndroid\b/.test(ua)) return 'Android Mobile';
  if (/\bSafari\//.test(ua)) return /\bMobile\b/.test(ua) ? 'Mobile Safari' : 'Safari';
  return undefined;
}

function detectOs(ua: string): string | undefined {
  if (/\bWindows Phone\b/.test(ua)) return 'Windows Phone';
  if (/\bWindows\b/.test(ua)) return 'Windows';
  if (/\b(?:iPhone|iPad|iPod)\b/.test(ua)) return 'iOS';
  if (/\bAndroid\b/.test(ua)) return 'Android';
  if (/\bCrOS\b/.test(ua)) return 'Chrome OS';
  if (/\bMac OS X\b|\bMacintosh\b/.test(ua)) return 'Mac OS X';
  if (/\bLinux\b/.test(ua)) return 'Linux';
  return undefined;
}

function detectDeviceType(ua: string, os: string | undefined): ParsedUserAgent['deviceType'] {
  if (/\biPad\b|\bTablet\b/.test(ua) || (/\bAndroid\b/.test(ua) && !/\bMobile\b/.test(ua))) {
    return 'Tablet';
  }
  if (/\bMobi|\biPhone\b|\biPod\b|\bAndroid\b|\bWindows Phone\b/.test(ua)) return 'Mobile';
  return os ? 'Desktop' : undefined;
}

/** Property values mirror the names posthog-js reports so breakdowns stay consistent. */
export function parseUserAgent(ua: string | undefined): ParsedUserAgent {
  if (!ua) return {};
  const os = detectOs(ua);
  return {
    browser: detectBrowser(ua),
    os,
    deviceType: detectDeviceType(ua, os),
  };
}

function enrichEvent(event: CaptureEvent, context: IngestClientContext, parsedUa: ParsedUserAgent): CaptureEvent {
  const properties = { ...event.properties };
  // Server-derived values win so a browser can't spoof its IP or user agent.
  if (context.ip) properties.$ip = context.ip;
  if (context.userAgent) properties.$raw_user_agent = context.userAgent;
  if (parsedUa.browser && properties.$browser === undefined) properties.$browser = parsedUa.browser;
  if (parsedUa.os && properties.$os === undefined) properties.$os = parsedUa.os;
  if (parsedUa.deviceType && properties.$device_type === undefined) {
    properties.$device_type = parsedUa.deviceType;
  }

  return { ...event, properties };
}

/**
 * Adds `$ip`, `$raw_user_agent`, `$browser`, `$os`, and `$device_type` to single or
 * batched capture payloads. Returns the original body untouched if it doesn't parse.
 */
export function enrichCapturePayload(body: string, context: IngestClientContext): string {
  if (!context.ip && !context.userAgent) return body;

  try {
    const json: unknown = JSON.parse(body);
    const parsedUa = parseUserAgent(context.userAgent);

    const batch = captureBatchSchema.safeParse(json);
    if (batch.success) {
      return JSON.stringify({
        ...batch.data,
        batch: batch.data.batch.map((event) => enrichEvent(event, context, parsedUa)),
      });
    }

    const event = captureEventSchema.safeParse(json);
    return event.success ? JSON.stringify(enrichEvent(event.data, context, parsedUa)) : body;
  } catch {
    return body;
  }
}

export function buildUpstreamCaptureHeaders(context: IngestClientContext): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (context.ip) headers.set('X-Forwarded-For', context.ip);
  if (context.userAgent) headers.set('User-Agent', context.userAgent);
  return headers;
}
