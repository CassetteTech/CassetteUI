type ApiErrorDetails = {
  status?: unknown;
  errorCode?: unknown;
  error_code?: unknown;
  message?: unknown;
};

const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

function getDetails(error: unknown): ApiErrorDetails {
  return error && typeof error === 'object' ? (error as ApiErrorDetails) : {};
}

function getMessage(error: unknown, details: ApiErrorDetails): string {
  if (typeof details.message === 'string') {
    return details.message.trim();
  }
  return error instanceof Error ? error.message.trim() : '';
}

/**
 * Maps API failures to stable product copy without wrapping or mutating the
 * original error. Callers can inspect ApiError metadata first, then use this
 * helper only when rendering the failure.
 */
export function getUserFacingApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
): string {
  const details = getDetails(error);
  const status = typeof details.status === 'number' ? details.status : undefined;
  const rawCode = details.errorCode ?? details.error_code;
  const errorCode = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
  const message = getMessage(error, details);
  const normalizedMessage = message.toLowerCase();

  if (errorCode === 'AUTH_EXPIRED' || errorCode === 'AUTH_REQUIRED') {
    return 'Your connection has expired. Reconnect and try again.';
  }
  if (errorCode === 'INVALID_SOURCE_LINK') {
    return 'This music link could not be read. Check the link and try again.';
  }
  if (errorCode === 'PLAYLIST_NOT_FOUND') {
    return "We couldn't find that playlist.";
  }
  if (errorCode === 'NOT_FOUND') {
    return "We couldn't find what you were looking for.";
  }
  if (errorCode === 'BAD_REQUEST') {
    return 'Check the request details and try again.';
  }
  if (errorCode === 'PLAYLIST_EMPTY') {
    return 'This playlist does not contain any tracks to import.';
  }
  if (errorCode === 'JOB_NOT_FOUND') {
    return 'That conversion is no longer available. Please try again.';
  }
  if (errorCode === 'REQUEST_ABORTED') {
    return 'The conversion was interrupted. Please try again.';
  }
  if (errorCode === 'TIMEOUT') {
    return 'This is taking longer than expected. Please try again.';
  }
  if (errorCode === 'RATE_LIMITED') {
    return 'Too many requests. Wait a moment and try again.';
  }
  if (
    errorCode === 'SERVICE_UNAVAILABLE' ||
    errorCode === 'UPSTREAM_ERROR' ||
    errorCode === 'AUTH_ERROR'
  ) {
    return 'Cassette is temporarily unavailable. Please try again.';
  }

  if (status === 401) {
    return 'Your session expired. Please sign in and try again.';
  }
  if (status === 403) {
    return "You don't have permission to do that.";
  }
  if (status === 404) {
    return "We couldn't find what you were looking for.";
  }
  if (status === 408 || normalizedMessage.includes('timed out')) {
    return 'This is taking longer than expected. Please try again.';
  }
  if (status === 409 || status === 425) {
    return 'That request could not be completed because something changed. Please try again.';
  }
  if (status === 429) {
    return 'Too many requests. Wait a moment and try again.';
  }
  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    normalizedMessage.includes('cannot connect to api') ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('network error') ||
    normalizedMessage.includes('load failed') ||
    normalizedMessage.includes('invalid json response from api')
  ) {
    return 'Cassette is temporarily unavailable. Please try again.';
  }
  if (typeof status === 'number' && status >= 500) {
    return fallback;
  }
  if (
    normalizedMessage.includes('unsupported platform') ||
    normalizedMessage.includes('unsupported music service')
  ) {
    return "This music link isn't supported. Try a Spotify, Apple Music, or Deezer link.";
  }

  return message || fallback;
}
