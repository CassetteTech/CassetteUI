import { getBrowserApiBaseUrl } from '@/lib/utils/url';
import {
  readEmailPreferencesResponse,
  type EmailPreferenceSource,
  type EmailPreferencesResponse,
} from './email-preferences-contract';

export {
  EmailPreferenceRequestError,
  type EmailPreferenceSource,
  type EmailPreferencesResponse,
  type EmailPreferenceView,
} from './email-preferences-contract';

export type EmailPreferenceCategory = 'product_updates' | 'curator_digest';

class EmailPreferencesService {
  private readonly baseUrl = getBrowserApiBaseUrl();

  async get(signal?: AbortSignal): Promise<EmailPreferencesResponse> {
    return this.request('/api/v1/email/preferences', { method: 'GET', signal });
  }

  async update(
    category: EmailPreferenceCategory,
    enabled: boolean,
    source: EmailPreferenceSource,
    signal?: AbortSignal,
  ): Promise<EmailPreferencesResponse> {
    return this.request(`/api/v1/email/preferences/${category}`, {
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
    return readEmailPreferencesResponse(response);
  }
}

export const emailPreferencesService = new EmailPreferencesService();
