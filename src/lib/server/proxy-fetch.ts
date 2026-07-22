export function fetchBackendWithCallerCancellation(
  backendUrl: string,
  init: RequestInit,
  callerSignal: AbortSignal,
): Promise<Response> {
  return fetch(backendUrl, {
    ...init,
    signal: callerSignal,
  });
}
