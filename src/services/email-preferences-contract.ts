/** Defines the strict email preference response contract shared by the settings UI. */

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

// Each category is an independent choice. The curator digest also needs
// product updates to send, but saving one never changes the other.
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

// A response without either category fails as a bad gateway, so the settings
// never show a guessed value for a preference Bridge did not return.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function parseEmailPreferencesResponse(value: unknown): EmailPreferencesResponse {
  const parsed = emailPreferencesResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new EmailPreferenceRequestError(502);
  }

  return parsed.data;
}
