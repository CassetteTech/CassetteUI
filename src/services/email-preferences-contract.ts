import { z } from 'zod';

export type EmailPreferenceSource = 'settings';

const emailPreferenceViewSchema = z.object({
  enabled: z.boolean(),
  consentSource: z.string().nullable(),
  consentTextVersion: z.string().nullable(),
  consentedAtUtc: z.string().nullable(),
  lastChangedSource: z.string().nullable(),
  updatedAtUtc: z.string().nullable(),
});

const emailPreferencesResponseSchema = z.object({
  product_updates: emailPreferenceViewSchema,
  curator_digest: emailPreferenceViewSchema,
});

export type EmailPreferenceView = z.infer<typeof emailPreferenceViewSchema>;
export type EmailPreferencesResponse = z.infer<typeof emailPreferencesResponseSchema>;

export class EmailPreferenceRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super('Email preference request failed.');
    this.name = 'EmailPreferenceRequestError';
    this.status = status;
  }
}

// A failed request keeps its status. A body without either category fails as a
// bad gateway, so the settings never show a guessed value for a preference
// Bridge did not return.
export async function readEmailPreferencesResponse(response: Response): Promise<EmailPreferencesResponse> {
  if (!response.ok) {
    throw new EmailPreferenceRequestError(response.status);
  }

  const parsed = emailPreferencesResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new EmailPreferenceRequestError(502);
  }

  return parsed.data;
}
