export function getApiConnectionErrorMessage(
  url: string,
  isDevelopment = process.env.NODE_ENV === 'development',
): string {
  if (isDevelopment) {
    return `Cannot connect to API at ${url}. Is your local server running on port 5001?`;
  }

  return 'Cannot connect to Cassette. Please try again.';
}

export class ApiConnectionError extends Error {
  constructor(
    url: string,
    isDevelopment = process.env.NODE_ENV === 'development',
  ) {
    super(getApiConnectionErrorMessage(url, isDevelopment));
    this.name = 'ApiConnectionError';
  }
}
