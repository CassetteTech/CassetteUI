import { getBrowserApiBaseUrl } from '@/lib/utils/url';

export type EmailPreferenceSource = 'settings';

export interface ProductUpdatesEmailPreference {
  enabled: boolean;
  consentSource: string | null;
  consentTextVersion: string | null;
  consentedAtUtc: string | null;
  lastChangedSource: string | null;
  updatedAtUtc: string | null;
  syncStatus: string;
  sendEligible: boolean;
}

export interface EmailPreferencesResponse {
  product_updates: ProductUpdatesEmailPreference;
}

export class EmailPreferenceRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('Email preference request failed.');
    this.name = 'EmailPreferenceRequestError';
    this.status = status;
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function parseResponse(value: unknown): EmailPreferencesResponse {
  if (!value || typeof value !== 'object') {
    throw new EmailPreferenceRequestError(502);
  }

  const preference = (value as Record<string, unknown>).product_updates;
  if (!preference || typeof preference !== 'object') {
    throw new EmailPreferenceRequestError(502);
  }

  const productUpdates = preference as Record<string, unknown>;
  if (
    typeof productUpdates.enabled !== 'boolean' ||
    !isNullableString(productUpdates.consentSource) ||
    !isNullableString(productUpdates.consentTextVersion) ||
    !isNullableString(productUpdates.consentedAtUtc) ||
    !isNullableString(productUpdates.lastChangedSource) ||
    !isNullableString(productUpdates.updatedAtUtc) ||
    typeof productUpdates.syncStatus !== 'string' ||
    typeof productUpdates.sendEligible !== 'boolean'
  ) {
    throw new EmailPreferenceRequestError(502);
  }

  return {
    product_updates: {
      enabled: productUpdates.enabled,
      consentSource: productUpdates.consentSource,
      consentTextVersion: productUpdates.consentTextVersion,
      consentedAtUtc: productUpdates.consentedAtUtc,
      lastChangedSource: productUpdates.lastChangedSource,
      updatedAtUtc: productUpdates.updatedAtUtc,
      syncStatus: productUpdates.syncStatus,
      sendEligible: productUpdates.sendEligible,
    },
  };
}

class EmailPreferencesService {
  private readonly baseUrl = getBrowserApiBaseUrl();

  async get(signal?: AbortSignal): Promise<EmailPreferencesResponse> {
    return this.request('/api/v1/email/preferences', { method: 'GET', signal });
  }

  async updateProductUpdates(
    enabled: boolean,
    source: EmailPreferenceSource,
    signal?: AbortSignal,
  ): Promise<EmailPreferencesResponse> {
    return this.request('/api/v1/email/preferences/product_updates', {
      method: 'PUT',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled, source }),
    });
  }

  private async request(path: string, init: RequestInit): Promise<EmailPreferencesResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: 'include',
    });
    if (!response.ok) {
      throw new EmailPreferenceRequestError(response.status);
    }

    const body: unknown = await response.json().catch(() => {
      throw new EmailPreferenceRequestError(502);
    });
    return parseResponse(body);
  }
}

export const emailPreferencesService = new EmailPreferencesService();
